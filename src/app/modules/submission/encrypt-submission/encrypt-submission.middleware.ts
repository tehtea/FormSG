import { RequestHandler } from 'express'
import { ParamsDictionary } from 'express-serve-static-core'
import { SetOptional } from 'type-fest'

import { createReqMeta } from '../../../../app/utils/request'
import { createLoggerWithLabel } from '../../../../config/logger'
import {
  WithAutoReplyEmailData,
  WithForm,
  WithParsedResponses,
} from '../../../../types'
import { checkIsEncryptedEncoding } from '../../../utils/encryption'
import * as SubmissionService from '../submission.service'
import { getProcessedResponses } from '../submission.service'
import { ProcessedFieldResponse } from '../submission.types'

import {
  EncryptSubmissionBody,
  EncryptSubmissionBodyAfterProcess,
  WithAttachmentsData,
  WithFormData,
} from './encrypt-submission.types'
import { mapRouteError } from './encrypt-submission.utils'

const logger = createLoggerWithLabel(module)

/**
 * Extracts relevant fields, injects questions, verifies visibility of field and validates answers
 * to produce req.body.parsedResponses
 */

export const validateAndProcessEncryptSubmission: RequestHandler<
  { formId: string },
  unknown,
  EncryptSubmissionBody
> = (req, res, next) => {
  const { form } = req as WithForm<typeof req>
  const { encryptedContent, responses } = req.body

  // Step 1: Check whether submitted encryption is valid.
  return (
    checkIsEncryptedEncoding(encryptedContent)
      // Step 2: Encryption is valid, process given responses.
      .andThen(() => getProcessedResponses(form, responses))
      // If pass, then set parsedResponses and delete responses.
      .map((processedResponses) => {
        // eslint-disable-next-line @typescript-eslint/no-extra-semi
        ;(req.body as WithParsedResponses<
          typeof req.body
        >).parsedResponses = processedResponses
        // Prevent downstream functions from using responses by deleting it.
        delete (req.body as SetOptional<EncryptSubmissionBody, 'responses'>)
          .responses
        return next()
      })
      // If error, log and return res error.
      .mapErr((error) => {
        logger.error({
          message:
            'Error validating and processing encrypt submission responses',
          meta: {
            action: 'validateAndProcessEncryptSubmission',
            ...createReqMeta(req),
            formId: form._id,
          },
          error,
        })

        const { statusCode, errorMessage } = mapRouteError(error)
        return res.status(statusCode).json({
          message: errorMessage,
        })
      })
  )
}

/**
 * Verify structure of encrypted response
 */

export const prepareEncryptSubmission: RequestHandler<
  { formId: string },
  unknown,
  EncryptSubmissionBodyAfterProcess
> = (req, res, next) => {
  // Step 1: Add req.body.encryptedContent to req.formData
  // eslint-disable-next-line @typescript-eslint/no-extra-semi
  ;(req as WithFormData<typeof req>).formData = req.body.encryptedContent
  // Step 2: Add req.body.attachments to req.attachmentData
  ;(req as WithAttachmentsData<typeof req>).attachmentData =
    req.body.attachments || {}
  return next()
}

/**
 * Sends email confirmations to form-fillers, for email fields which have
 * email confirmation enabled.
 * @param req Express request object
 * @param res Express response object
 */
export const sendEmailConfirmations: RequestHandler<
  ParamsDictionary,
  unknown,
  { parsedResponses: ProcessedFieldResponse[] }
> = async (req, res) => {
  const {
    form,
    attachments,
    autoReplyData,
    submission,
    stripeCheckoutSession,
  } = req as WithAutoReplyEmailData<typeof req>
  // Return the reply early to the submitter
  res.json({
    message: 'Form submission successful.',
    submissionId: submission.id,
    stripeCheckoutSessionId: stripeCheckoutSession
      ? stripeCheckoutSession.id
      : null,
  })
  return SubmissionService.sendEmailConfirmations({
    form,
    parsedResponses: req.body.parsedResponses,
    submission,
    attachments,
    autoReplyData,
  }).mapErr((error) => {
    logger.error({
      message: 'Error while sending email confirmations',
      meta: {
        action: 'sendEmailAutoReplies',
      },
      error,
    })
  })
}
