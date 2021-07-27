import { Router } from 'express'

import * as AdminFormController from '../../../../../modules/form/admin-form/admin-form.controller'

export const AdminFormsTemplateRouter = Router()

/**
 * Return the template form to the user.
 * Only allows for public forms, for any logged in user.
 * @route GET /:formId/template
 * @security session
 *
 * @returns 200 with target form's public view
 * @returns 401 when user does not exist in session
 * @returns 403 when the target form is private
 * @returns 404 when form cannot be found
 * @returns 410 when form is archived
 * @returns 500 when database error occurs
 */
AdminFormsTemplateRouter.get(
  '/:formId([a-fA-F0-9]{24})/template',
  AdminFormController.handleGetTemplateForm,
)

/**
 * Duplicate a specified form and return that form to the user.
 * @route GET /:formId/template/copy
 * @security session
 *
 * @returns 200 with the duplicate form dashboard view
 * @returns 400 when Joi validation fails
 * @returns 401 when user does not exist in session
 * @returns 403 when form is private
 * @returns 404 when form cannot be found
 * @returns 410 when form is archived
 * @returns 422 when user in session cannot be retrieved from the database
 * @returns 500 when database error occurs
 */
AdminFormsTemplateRouter.post(
  '/:formId([a-fA-F0-9]{24})/template/copy',
  AdminFormController.handleCopyTemplateForm,
)
