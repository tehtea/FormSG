/* eslint-disable @typescript-eslint/ban-ts-comment */
import { ObjectId } from 'bson-ext'
import mongoose from 'mongoose'
import supertest, { Session } from 'supertest-session'

import getFormModel, {
  getEncryptedFormModel,
} from 'src/app/models/form.server.model'
import getUserModel from 'src/app/models/user.server.model'
import {
  BasicField,
  IFormDocument,
  IUserSchema,
  ResponseMode,
  Status,
} from 'src/types'

import {
  createAuthedSession,
  logoutSession,
} from 'tests/integration/helpers/express-auth'
import { setupApp } from 'tests/integration/helpers/express-setup'
import { buildCelebrateError } from 'tests/unit/backend/helpers/celebrate'
import { generateDefaultField } from 'tests/unit/backend/helpers/generate-form-data'
import dbHandler from 'tests/unit/backend/helpers/jest-db'
import { jsonParseStringify } from 'tests/unit/backend/helpers/serialize-data'

import { AdminFormsRouter } from '../admin-forms.routes'

// Prevent rate limiting.
jest.mock('src/app/utils/limit-rate')

const UserModel = getUserModel(mongoose)
const FormModel = getFormModel(mongoose)
const EncryptFormModel = getEncryptedFormModel(mongoose)

const ADMIN_FORMS_PREFIX = '/admin/forms'
const app = setupApp(ADMIN_FORMS_PREFIX, AdminFormsRouter, {
  setupWithAuth: true,
})

describe('admin-form.template.routes', () => {
  let request: Session
  let defaultUser: IUserSchema

  beforeAll(async () => await dbHandler.connect())
  beforeEach(async () => {
    request = supertest(app)
    const { user } = await dbHandler.insertFormCollectionReqs()
    // Default all requests to come from authenticated user.
    request = await createAuthedSession(user.email, request)
    defaultUser = user
  })
  afterEach(async () => {
    await dbHandler.clearDatabase()
    jest.restoreAllMocks()
  })
  afterAll(async () => await dbHandler.closeDatabase())

  describe('GET /:formId/template', () => {
    it("should return 200 with target form's public view", async () => {
      // Arrange
      const anotherUser = (
        await dbHandler.insertFormCollectionReqs({
          userId: new ObjectId(),
          mailName: 'some-user',
          shortName: 'someUser',
        })
      ).user
      // Create public form
      const publicForm = await FormModel.create({
        title: 'some public form',
        status: Status.Public,
        responseMode: ResponseMode.Encrypt,
        publicKey: 'some public key',
        admin: anotherUser._id,
        form_fields: [
          generateDefaultField(BasicField.Date),
          generateDefaultField(BasicField.Nric),
        ],
      })

      // Act
      const response = await request.get(
        `${ADMIN_FORMS_PREFIX}/${publicForm._id}/template`,
      )

      // Assert
      const populatedForm = await publicForm
        .populate({ path: 'admin', populate: { path: 'agency' } })
        .execPopulate()
      expect(response.status).toEqual(200)
      expect(response.body).toEqual({
        form: jsonParseStringify(populatedForm.getPublicView()),
      })
    })

    it('should return 401 when user is not logged in', async () => {
      // Arrange
      await logoutSession(request)

      // Act
      const response = await request.get(
        `${ADMIN_FORMS_PREFIX}/${new ObjectId()}/template`,
      )

      // Assert
      expect(response.status).toEqual(401)
      expect(response.body).toEqual({ message: 'User is unauthorized.' })
    })

    it('should return 403 when the target form is private', async () => {
      // Arrange
      const anotherUser = (
        await dbHandler.insertFormCollectionReqs({
          userId: new ObjectId(),
          mailName: 'some-user',
          shortName: 'someUser',
        })
      ).user
      // Create private form
      const privateForm = await FormModel.create({
        title: 'some private form',
        status: Status.Private,
        responseMode: ResponseMode.Encrypt,
        publicKey: 'some public key',
        admin: anotherUser._id,
        form_fields: [generateDefaultField(BasicField.Nric)],
      })

      // Act
      const response = await request.get(
        `${ADMIN_FORMS_PREFIX}/${privateForm._id}/template`,
      )

      // Assert
      expect(response.status).toEqual(403)
      expect(response.body).toEqual({
        formTitle: privateForm.title,
        isPageFound: true,
        message: expect.any(String),
      })
    })

    it('should return 404 when the form cannot be found', async () => {
      // Act
      const response = await request.get(
        `${ADMIN_FORMS_PREFIX}/${new ObjectId()}/template`,
      )

      // Assert
      expect(response.status).toEqual(404)
      expect(response.body).toEqual({ message: 'Form not found' })
    })

    it('should return 410 when the form is already archived', async () => {
      // Arrange
      const anotherUser = (
        await dbHandler.insertFormCollectionReqs({
          userId: new ObjectId(),
          mailName: 'some-user',
          shortName: 'someUser',
        })
      ).user
      const archivedForm = await FormModel.create({
        title: 'some archived form',
        status: Status.Archived,
        responseMode: ResponseMode.Encrypt,
        publicKey: 'some public key',
        admin: anotherUser._id,
        form_fields: [generateDefaultField(BasicField.Nric)],
      })

      // Act
      const response = await request.get(
        `${ADMIN_FORMS_PREFIX}/${archivedForm._id}/template`,
      )

      // Assert
      expect(response.status).toEqual(410)
      expect(response.body).toEqual({
        message: 'This form is no longer active',
      })
    })

    it('should return 500 when database error occurs whilst retrieving form', async () => {
      // Arrange
      const formToRetrieve = await FormModel.create({
        title: 'some form',
        status: Status.Public,
        responseMode: ResponseMode.Email,
        emails: [defaultUser.email],
        admin: defaultUser._id,
        form_fields: [generateDefaultField(BasicField.Nric)],
      })
      // Mock database error.
      jest
        .spyOn(FormModel, 'getFullFormById')
        .mockRejectedValueOnce(new Error('something went wrong'))

      // Act
      const response = await request.get(
        `${ADMIN_FORMS_PREFIX}/${formToRetrieve._id}/template`,
      )

      // Assert
      expect(response.status).toEqual(500)
      expect(response.body).toEqual({
        message: 'Something went wrong. Please try again.',
      })
    })
  })

  describe('POST /:formId/template/copy', () => {
    let formToCopy: IFormDocument
    let anotherUser: IUserSchema

    beforeEach(async () => {
      anotherUser = (
        await dbHandler.insertFormCollectionReqs({
          userId: new ObjectId(),
          mailName: 'some-user',
          shortName: 'someUser',
        })
      ).user
      formToCopy = (await EncryptFormModel.create({
        title: 'some form',
        admin: anotherUser._id,
        publicKey: 'some random key',
        // Must be public to copy
        status: Status.Public,
      })) as IFormDocument
    })

    it('should return 200 with duplicated form dashboard view when copying to an email mode form', async () => {
      // Act
      const bodyParams = {
        title: 'some title',
        responseMode: ResponseMode.Email,
        emails: [defaultUser.email],
      }
      const response = await request
        .post(`${ADMIN_FORMS_PREFIX}/${formToCopy._id}/template/copy`)
        .send(bodyParams)

      // Assert
      const expected = expect.objectContaining({
        _id: expect.any(String),
        admin: expect.objectContaining({
          _id: defaultUser.id,
        }),
        title: bodyParams.title,
        responseMode: bodyParams.responseMode,
      })
      expect(response.status).toEqual(200)
      expect(response.body).toEqual(expected)
    })

    it('should return 200 with duplicated form dashboard view when copying to a storage mode form', async () => {
      // Act
      const bodyParams = {
        title: 'some other title',
        responseMode: ResponseMode.Encrypt,
        publicKey: 'some public key',
      }
      const response = await request
        .post(`${ADMIN_FORMS_PREFIX}/${formToCopy._id}/template/copy`)
        .send(bodyParams)

      // Assert
      const expected = expect.objectContaining({
        _id: expect.any(String),
        admin: expect.objectContaining({
          _id: defaultUser.id,
        }),
        title: bodyParams.title,
        responseMode: bodyParams.responseMode,
      })
      expect(response.status).toEqual(200)
      expect(response.body).toEqual(expected)
    })

    it('should return 400 when body.responseMode is missing', async () => {
      // Act
      const response = await request
        .post(`${ADMIN_FORMS_PREFIX}/${formToCopy._id}/template/copy`)
        .send({
          title: 'some title',
          // body.responseMode is missing
          emails: [defaultUser.email],
        })

      // Assert
      expect(response.status).toEqual(400)
      expect(response.body).toEqual(
        buildCelebrateError({
          body: { key: 'responseMode' },
        }),
      )
    })

    it('should return 400 when body.responseMode is invalid', async () => {
      // Act
      const response = await request
        .post(`${ADMIN_FORMS_PREFIX}/${formToCopy._id}/template/copy`)
        .send({
          title: 'some title',
          responseMode: 'some rubbish',
          emails: [defaultUser.email],
        })

      // Assert
      expect(response.status).toEqual(400)
      expect(response.body).toEqual(
        buildCelebrateError({
          body: {
            key: 'responseMode',
            message: `"responseMode" must be one of [${Object.values(
              ResponseMode,
            ).join(', ')}]`,
          },
        }),
      )
    })

    it('should return 400 when body.title is missing', async () => {
      // Act
      const response = await request
        .post(`${ADMIN_FORMS_PREFIX}/${formToCopy._id}/template/copy`)
        .send({
          // body.title missing
          responseMode: ResponseMode.Email,
          emails: [defaultUser.email],
        })

      // Assert
      expect(response.status).toEqual(400)
      expect(response.body).toEqual(
        buildCelebrateError({
          body: { key: 'title' },
        }),
      )
    })

    it('should return 400 when body.emails is missing when copying to an email form', async () => {
      // Act
      const response = await request
        .post(`${ADMIN_FORMS_PREFIX}/${formToCopy._id}/template/copy`)
        .send({
          title: 'new email form',
          responseMode: ResponseMode.Email,
          // body.emails missing.
        })

      // Assert
      expect(response.status).toEqual(400)
      expect(response.body).toEqual(
        buildCelebrateError({
          body: { key: 'emails' },
        }),
      )
    })

    it('should return 400 when body.emails is an empty string when copying to an email form', async () => {
      // Act
      const response = await request
        .post(`${ADMIN_FORMS_PREFIX}/${formToCopy._id}/template/copy`)
        .send({
          title: 'new email form',
          responseMode: ResponseMode.Email,
          emails: '',
        })

      // Assert
      expect(response.status).toEqual(400)
      expect(response.body).toEqual(
        buildCelebrateError({
          body: {
            key: 'emails',
            message: '"emails" is not allowed to be empty',
          },
        }),
      )
    })

    it('should return 400 when body.emails is an empty array when copying to an email form', async () => {
      // Act
      const response = await request
        .post(`${ADMIN_FORMS_PREFIX}/${formToCopy._id}/template/copy`)
        .send({
          title: 'new email form',
          responseMode: ResponseMode.Email,
          emails: [],
        })

      // Assert
      expect(response.status).toEqual(400)
      expect(response.body).toEqual(
        buildCelebrateError({
          body: {
            key: 'emails',
            message: '"emails" must contain at least 1 items',
          },
        }),
      )
    })

    it('should return 400 when body.publicKey is missing when copying to a storage mode form', async () => {
      // Act
      const response = await request
        .post(`${ADMIN_FORMS_PREFIX}/${formToCopy._id}/template/copy`)
        .send({
          title: 'new storage mode form',
          responseMode: ResponseMode.Encrypt,
          // publicKey missing.
        })

      // Assert
      expect(response.status).toEqual(400)
      expect(response.body).toEqual(
        buildCelebrateError({
          body: {
            key: 'publicKey',
          },
        }),
      )
    })

    it('should return 400 when body.publicKey is an empty string when copying to a storage mode form', async () => {
      // Act
      const response = await request
        .post(`${ADMIN_FORMS_PREFIX}/${formToCopy._id}/template/copy`)
        .send({
          title: 'new storage mode form',
          responseMode: ResponseMode.Encrypt,
          publicKey: '',
        })

      // Assert
      expect(response.status).toEqual(400)
      expect(response.body).toEqual(
        buildCelebrateError({
          body: {
            key: 'publicKey',
            message: '"publicKey" contains an invalid value',
          },
        }),
      )
    })

    it('should return 401 when user is not logged in', async () => {
      // Arrange
      await logoutSession(request)

      // Act
      const response = await request.post(
        `${ADMIN_FORMS_PREFIX}/${new ObjectId()}/template/copy`,
      )

      // Assert
      expect(response.status).toEqual(401)
      expect(response.body).toEqual({ message: 'User is unauthorized.' })
    })

    it('should return 403 when form to copy is private', async () => {
      // Arrange
      const bodyParams = {
        title: 'some title',
        responseMode: ResponseMode.Email,
        emails: [defaultUser.email],
      }
      // Create private form
      const privateForm = await FormModel.create({
        title: 'some private form',
        status: Status.Private,
        responseMode: ResponseMode.Encrypt,
        publicKey: 'some public key',
        admin: anotherUser._id,
        form_fields: [generateDefaultField(BasicField.Nric)],
      })

      // Act
      const response = await request
        .post(`${ADMIN_FORMS_PREFIX}/${privateForm._id}/template/copy`)
        .send(bodyParams)

      // Assert
      expect(response.status).toEqual(403)
      expect(response.body).toEqual({
        message: 'Form must be public to be copied',
      })
    })

    it('should return 404 when the form cannot be found', async () => {
      // Act
      const response = await request
        .post(`${ADMIN_FORMS_PREFIX}/${new ObjectId()}/template/copy`)
        .send({
          title: 'some new title',
          responseMode: ResponseMode.Encrypt,
          publicKey: 'booyeah',
        })

      // Assert
      expect(response.status).toEqual(404)
      expect(response.body).toEqual({
        message: 'Form not found',
      })
    })

    it('should return 410 when the form to copy is archived', async () => {
      // Arrange
      // Create archived form.
      // Arrange
      const archivedForm = await EncryptFormModel.create({
        title: 'archived form',
        status: Status.Archived,
        responseMode: ResponseMode.Encrypt,
        publicKey: 'does not matter',
        admin: anotherUser._id,
      })

      // Act
      const response = await request
        .post(`${ADMIN_FORMS_PREFIX}/${archivedForm._id}/template/copy`)
        .send({
          title: 'some new title',
          responseMode: ResponseMode.Encrypt,
          publicKey: 'booyeah',
        })

      // Assert
      expect(response.status).toEqual(410)
      expect(response.body).toEqual({
        message: 'This form is no longer active',
      })
    })

    it('should return 422 when the user in session cannot be retrieved from the database', async () => {
      // Arrange
      // Delete user after login.
      await dbHandler.clearCollection(UserModel.collection.name)

      // Act
      const response = await request
        .post(`${ADMIN_FORMS_PREFIX}/${formToCopy._id}/template/copy`)
        .send({
          title: 'some new title',
          responseMode: ResponseMode.Encrypt,
          publicKey: 'booyeah',
        })

      // Assert
      expect(response.status).toEqual(422)
      expect(response.body).toEqual({ message: 'User not found' })
    })

    it('should return 500 when database error occurs whilst copying form', async () => {
      // Arrange
      // Mock database error.
      const mockErrorString = 'something went wrong'
      jest
        .spyOn(FormModel, 'create')
        // @ts-ignore
        .mockRejectedValueOnce(new Error(mockErrorString))

      // Act
      const response = await request
        .post(`${ADMIN_FORMS_PREFIX}/${formToCopy._id}/template/copy`)
        .send({
          title: 'some new title',
          responseMode: ResponseMode.Encrypt,
          publicKey: 'booyeah',
        })

      // Assert
      expect(response.status).toEqual(500)
      expect(response.body).toEqual({
        message: `Error: [${mockErrorString}]. Please refresh and try again. If you still need help, email us at form@open.gov.sg.`,
      })
    })
  })
})
