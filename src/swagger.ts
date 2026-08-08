import swaggerUi from 'swagger-ui-express';
import { Express } from 'express';
import { env } from './config/env';

const swaggerDocument = {
  openapi: '3.0.3',
  info: {
    title: 'Minimi Agri Backend API',
    version: '1.0.0',
    description: 'API documentation for the Minimi Agri farmer-vet platform backend.',
  },
  servers: [
    {
      url: `http://localhost:${env.port}`,
      description: 'Local development server',
    },
  ],
  tags: [
    { name: 'Health' },
    { name: 'Auth' },
    { name: 'Farmers' },
    { name: 'Vets' },
    { name: 'Service Requests' },
    { name: 'Chat' },
    { name: 'Payments' },
    { name: 'Subscriptions' },
    { name: 'Uploads' },
    { name: 'Admin' },
    { name: 'Reference' },
  ],
  paths: {
    '/health': {
      get: {
        tags: ['Health'],
        summary: 'Health check',
        responses: {
          200: { description: 'API is healthy' },
        },
      },
    },
    '/api/auth/farmer/register': {
      post: {
        tags: ['Auth'],
        summary: 'Register a farmer',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['fullName', 'idNumber', 'phone', 'county', 'subCounty'],
                properties: {
                  fullName: { type: 'string', example: 'Jane Wanjiku' },
                  idNumber: { type: 'string', example: '30000002' },
                  phone: { type: 'string', example: '254700000002' },
                  county: { type: 'string', example: 'Kiambu' },
                  subCounty: { type: 'string', example: 'Ruiru' },
                },
              },
            },
          },
        },
        responses: { 201: { description: 'Farmer created' } },
      },
    },
    '/api/auth/farmer/login': {
      post: {
        tags: ['Auth'],
        summary: 'Start farmer login with OTP',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['idNumber', 'phone'],
                properties: {
                  idNumber: { type: 'string', example: '30000002' },
                  phone: { type: 'string', example: '254700000002' },
                },
              },
            },
          },
        },
        responses: { 200: { description: 'OTP flow started' } },
      },
    },
    '/api/auth/farmer/verify-otp': {
      post: {
        tags: ['Auth'],
        summary: 'Verify farmer OTP and issue tokens',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['idNumber', 'phone', 'code'],
                properties: {
                  idNumber: { type: 'string', example: '30000002' },
                  phone: { type: 'string', example: '254700000002' },
                  code: { type: 'string', example: '123456' },
                },
              },
            },
          },
        },
        responses: { 200: { description: 'Tokens issued' } },
      },
    },
    '/api/auth/vet/register': {
      post: {
        tags: ['Auth'],
        summary: 'Register a vet',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['fullName', 'idNumber', 'phone', 'county', 'subCounty'],
                properties: {
                  fullName: { type: 'string', example: 'Dr. Achieng' },
                  idNumber: { type: 'string', example: '30000001' },
                  phone: { type: 'string', example: '254700000001' },
                  county: { type: 'string', example: 'Kiambu' },
                  subCounty: { type: 'string', example: 'Ruiru' },
                  passportImage: { type: 'string', nullable: true, description: 'Base64 data URL of the vet passport photo', example: 'data:image/jpeg;base64,/9j/4AAQSkZJRgABAQ...' },
                },
              },
            },
          },
        },
        responses: { 201: { description: 'Vet created', content: { 'application/json': { schema: { $ref: '#/components/schemas/Vet' } } } } },
      },
    },
    '/api/auth/vet/login': {
      post: {
        tags: ['Auth'],
        summary: 'Start vet login with OTP',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['idNumber', 'phone'],
                properties: {
                  idNumber: { type: 'string', example: '30000001' },
                  phone: { type: 'string', example: '254700000001' },
                },
              },
            },
          },
        },
        responses: { 200: { description: 'OTP flow started' } },
      },
    },
    '/api/auth/vet/verify-otp': {
      post: {
        tags: ['Auth'],
        summary: 'Verify vet OTP and issue tokens',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['idNumber', 'phone', 'code'],
                properties: {
                  idNumber: { type: 'string', example: '30000001' },
                  phone: { type: 'string', example: '254700000001' },
                  code: { type: 'string', example: '123456' },
                },
              },
            },
          },
        },
        responses: { 200: { description: 'Tokens issued' } },
      },
    },
    '/api/auth/admin/login': {
      post: {
        tags: ['Auth'],
        summary: 'Admin login',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['username', 'password'],
                properties: {
                  username: { type: 'string', example: 'admin' },
                  password: { type: 'string', example: 'change-me-now' },
                },
              },
            },
          },
        },
        responses: { 200: { description: 'Admin authenticated' } },
      },
    },
    '/api/auth/refresh-token': {
      post: {
        tags: ['Auth'],
        summary: 'Refresh access token',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['refreshToken'],
                properties: {
                  refreshToken: { type: 'string', example: 'your-refresh-token' },
                },
              },
            },
          },
        },
        responses: { 200: { description: 'New tokens issued' } },
      },
    },
    '/api/auth/logout': {
      post: {
        tags: ['Auth'],
        summary: 'Logout and revoke refresh token',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['refreshToken'],
                properties: {
                  refreshToken: { type: 'string', example: 'your-refresh-token' },
                },
              },
            },
          },
        },
        responses: { 204: { description: 'Logged out' } },
      },
    },
    '/api/farmer/profile': {
      get: {
        tags: ['Farmers'],
        summary: 'Get current farmer profile',
        security: [{ bearerAuth: [] }],
        responses: { 200: { description: 'Farmer profile' } },
      },
    },
    '/api/vet/profile': {
      get: {
        tags: ['Vets'],
        summary: 'Get current vet profile',
        security: [{ bearerAuth: [] }],
        responses: { 200: { description: 'Vet profile', content: { 'application/json': { schema: { $ref: '#/components/schemas/Vet' } } } } },
      },
    },
    '/api/vet/profile/image': {
      post: {
        tags: ['Vets'],
        summary: 'Upload vet profile image (multipart) — image is converted to base64 and stored',
        security: [{ bearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            'multipart/form-data': {
              schema: {
                type: 'object',
                required: ['image'],
                properties: {
                  image: { type: 'string', format: 'binary', description: 'Profile image file (field name: image). Max 5MB.' },
                },
              },
            },
          },
        },
        responses: { 200: { description: 'Profile image updated as base64 data URL', content: { 'application/json': { schema: { $ref: '#/components/schemas/Vet' } } } } },
      },
    },
    '/api/vets/{id}/profile': {
      get: {
        tags: ['Vets'],
        summary: 'Get public vet profile by ID',
        security: [{ bearerAuth: [] }],
        parameters: [
          { name: 'id', in: 'path', required: true, schema: { type: 'string' }, example: 'clx1vet0000001' },
        ],
        responses: { 200: { description: 'Public vet profile', content: { 'application/json': { schema: { $ref: '#/components/schemas/VetPublic' } } } } },
      },
    },
    '/api/vet/requests': {
      get: {
        tags: ['Vets'],
        summary: 'List requests visible to a vet',
        security: [{ bearerAuth: [] }],
        responses: { 200: { description: 'List of requests' } },
      },
    },
    '/api/vet/earnings': {
      get: {
        tags: ['Vets'],
        summary: 'Get vet earnings report',
        security: [{ bearerAuth: [] }],
        responses: { 200: { description: 'Earnings report' } },
      },
    },
    '/api/vets/nearby': {
      get: {
        tags: ['Vets'],
        summary: 'Find nearby approved vets',
        security: [{ bearerAuth: [] }],
        parameters: [
          { name: 'county', in: 'query', required: true, schema: { type: 'string' }, example: 'Kiambu' },
          { name: 'subCounty', in: 'query', required: false, schema: { type: 'string' }, example: 'Ruiru' },
          { name: 'page', in: 'query', required: false, schema: { type: 'integer', default: 1 } },
          { name: 'limit', in: 'query', required: false, schema: { type: 'integer', default: 20 } },
        ],
        responses: {
          200: {
            description: 'Nearby vets',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    vets: { type: 'array', items: { $ref: '#/components/schemas/Vet' } },
                    pagination: {
                      type: 'object',
                      properties: {
                        total: { type: 'integer' },
                        page: { type: 'integer' },
                        limit: { type: 'integer' },
                        totalPages: { type: 'integer' },
                      },
                    },
                  },
                },
              },
            },
          },
        },
      },
    },
    '/api/wallet': {
      get: {
        tags: ['Wallets'],
        summary: 'Get current user wallet balance and transaction history',
        security: [{ bearerAuth: [] }],
        parameters: [
          { name: 'page', in: 'query', required: false, schema: { type: 'integer', default: 1 } },
          { name: 'limit', in: 'query', required: false, schema: { type: 'integer', default: 20 } },
        ],
        responses: { 200: { description: 'Wallet balance and transactions' } },
      },
    },
    '/api/wallet/deposits/stk-push': {
      post: {
        tags: ['Wallets'],
        summary: 'Initiate M-Pesa STK push to top up wallet',
        security: [{ bearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['amount', 'phone'],
                properties: {
                  amount: { type: 'number', example: 1000, description: 'Deposit amount in KES' },
                  phone: { type: 'string', example: '254712345678' },
                },
              },
            },
          },
        },
        responses: { 201: { description: 'STK push initiated for wallet deposit' } },
      },
    },
    '/api/wallet/payment-requests': {
      get: {
        tags: ['Wallets'],
        summary: 'List wallet payment requests',
        security: [{ bearerAuth: [] }],
        parameters: [
          { name: 'page', in: 'query', required: false, schema: { type: 'integer', default: 1 } },
          { name: 'limit', in: 'query', required: false, schema: { type: 'integer', default: 20 } },
        ],
        responses: { 200: { description: 'Payment requests list' } },
      },
    },
    '/api/wallet/payment-requests/{requestId}': {
      post: {
        tags: ['Wallets'],
        summary: 'Vet creates a wallet payment request for a service request',
        security: [{ bearerAuth: [] }],
        parameters: [
          { name: 'requestId', in: 'path', required: true, schema: { type: 'string' } },
        ],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['amount'],
                properties: {
                  amount: { type: 'number', example: 1500 },
                },
              },
            },
          },
        },
        responses: { 201: { description: 'Payment request created' } },
      },
    },
    '/api/wallet/payment-requests/{id}/accept': {
      post: {
        tags: ['Wallets'],
        summary: 'Farmer accepts and pays a wallet payment request',
        security: [{ bearerAuth: [] }],
        parameters: [
          { name: 'id', in: 'path', required: true, schema: { type: 'string' } },
        ],
        responses: { 200: { description: 'Payment request accepted and paid' } },
      },
    },
    '/api/wallet/payment-requests/{id}/reject': {
      post: {
        tags: ['Wallets'],
        summary: 'Farmer rejects a wallet payment request',
        security: [{ bearerAuth: [] }],
        parameters: [
          { name: 'id', in: 'path', required: true, schema: { type: 'string' } },
        ],
        responses: { 204: { description: 'Payment request rejected' } },
      },
    },
    '/api/service-requests': {
      post: {
        tags: ['Service Requests'],
        summary: 'Create a service request',
        security: [{ bearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['county', 'subCounty', 'description', 'animalOrCropType'],
                properties: {
                  county: { type: 'string', example: 'Kiambu' },
                  subCounty: { type: 'string', example: 'Ruiru' },
                  description: { type: 'string', example: 'Cow has a swollen leg' },
                  animalOrCropType: { type: 'string', example: 'Cattle' },
                  vetId: { type: 'string', example: 'optional-vet-id' },
                },
              },
            },
          },
        },
        responses: { 201: { description: 'Created request' } },
      },
    },
    '/api/service-requests/my': {
      get: {
        tags: ['Service Requests'],
        summary: 'List current farmer requests',
        security: [{ bearerAuth: [] }],
        responses: { 200: { description: 'Requests list' } },
      },
    },
    '/api/service-requests/{id}': {
      get: {
        tags: ['Service Requests'],
        summary: 'Get service request details',
        security: [{ bearerAuth: [] }],
        responses: { 200: { description: 'Request details' } },
      },
    },
    '/api/service-requests/{id}/accept': {
      patch: {
        tags: ['Service Requests'],
        summary: 'Accept a pending service request',
        security: [{ bearerAuth: [] }],
        responses: { 200: { description: 'Request accepted' } },
      },
    },
    '/api/service-requests/{id}/complete': {
      patch: {
        tags: ['Service Requests'],
        summary: 'Mark a service request completed',
        security: [{ bearerAuth: [] }],
        responses: { 200: { description: 'Request completed' } },
      },
    },
    '/api/service-requests/{id}/fee': {
      patch: {
        tags: ['Service Requests'],
        summary: 'Set or approve a service fee for a request',
        security: [{ bearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['amount'],
                properties: {
                  amount: { type: 'number', example: 1500 },
                  approve: { type: 'boolean', example: false },
                },
              },
            },
          },
        },
        responses: { 200: { description: 'Fee updated' } },
      },
    },
    '/api/chat/{requestId}/messages': {
      get: {
        tags: ['Chat'],
        summary: 'Get chat history for a request',
        security: [{ bearerAuth: [] }],
        parameters: [
          { name: 'requestId', in: 'path', required: true, schema: { type: 'string' } },
          { name: 'before', in: 'query', required: false, schema: { type: 'string' }, description: 'Message ID to paginate before' },
          { name: 'page', in: 'query', required: false, schema: { type: 'integer', default: 1 } },
          { name: 'limit', in: 'query', required: false, schema: { type: 'integer', default: 20 } },
        ],
        responses: { 200: { description: 'Chat messages' } },
      },
    },
    '/api/chat/inbox': {
      get: {
        tags: ['Chat'],
        summary: 'Get chat inbox with latest messages and unread counts',
        security: [{ bearerAuth: [] }],
        responses: { 200: { description: 'Chat threads' } },
      },
    },
    '/api/chat/{requestId}/read': {
      patch: {
        tags: ['Chat'],
        summary: 'Mark messages as read for a request',
        security: [{ bearerAuth: [] }],
        parameters: [
          { name: 'requestId', in: 'path', required: true, schema: { type: 'string' } },
        ],
        responses: { 200: { description: 'Messages marked as read' } },
      },
    },
    '/api/mpesa/stk-push': {
      post: {
        tags: ['Payments'],
        summary: 'Initiate an M-Pesa STK push (requires approved fee)',
        security: [{ bearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['requestId', 'phone'],
                properties: {
                  requestId: { type: 'string', example: '670873d0-c6bd-4e02-860f-30598645bf19' },
                  amount: { type: 'number', example: 1500, description: 'Optional. Defaults to the approved service fee on the request.' },
                  phone: { type: 'string', example: '254796598108' },
                },
              },
            },
          },
        },
        responses: {
          201: {
            description: 'STK push initiated. Payment record created with status pending.',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    payment: { $ref: '#/components/schemas/Payment' },
                  },
                },
              },
            },
          },
          409: { description: 'Fee not approved, request cancelled, or fee is zero' },
          403: { description: 'Not your request' },
          404: { description: 'Request not found' },
        },
      },
    },
    '/api/mpesa/callback': {
      post: {
        tags: ['Payments'],
        summary: 'Safaricom callback endpoint',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                description: 'Daraja callback payload',
                example: {
                  Body: {
                    stkCallback: {
                      CheckoutRequestID: 'MOCK-123',
                      ResultCode: 0,
                      CallbackMetadata: {
                        Item: [{ Name: 'MpesaReceiptNumber', Value: 'ABC123' }],
                      },
                    },
                  },
                },
              },
            },
          },
        },
        responses: { 200: { description: 'Callback accepted' } },
      },
    },
    '/api/mpesa/simulate-callback': {
      post: {
        tags: ['Payments'],
        summary: 'Dev-only callback simulation',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['checkoutRequestId', 'success'],
                properties: {
                  checkoutRequestId: { type: 'string', example: 'MOCK-123' },
                  success: { type: 'boolean', example: true },
                },
              },
            },
          },
        },
        responses: { 200: { description: 'Simulated payment callback' } },
      },
    },
    '/api/payments/{requestId}': {
      get: {
        tags: ['Payments'],
        summary: 'Get latest payment for a service request',
        security: [{ bearerAuth: [] }],
        parameters: [
          { name: 'requestId', in: 'path', required: true, schema: { type: 'string' }, example: '670873d0-c6bd-4e02-860f-30598645bf19' },
        ],
        responses: {
          200: {
            description: 'Payment details',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: { payment: { $ref: '#/components/schemas/Payment' } },
                },
              },
            },
          },
          404: { description: 'No payment found for this request' },
        },
      },
    },
    '/api/payments/farmer/{farmerId}': {
      get: {
        tags: ['Payments'],
        summary: 'Get all payments made by a specific farmer',
        description: 'Returns a list of all payments linked to the given farmer, including farmer and vet names. Accessible by the farmer themselves or an admin.',
        security: [{ bearerAuth: [] }],
        parameters: [
          { name: 'farmerId', in: 'path', required: true, schema: { type: 'string' }, example: 'clx1farmer001' },
          { name: 'page', in: 'query', required: false, schema: { type: 'integer', default: 1 }, example: 1 },
          { name: 'limit', in: 'query', required: false, schema: { type: 'integer', default: 10 }, example: 10 },
        ],
        responses: {
          200: {
            description: 'Paginated list of payments for the farmer',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    payments: {
                      type: 'array',
                      items: { $ref: '#/components/schemas/PaymentWithNames' },
                    },
                    pagination: {
                      type: 'object',
                      properties: {
                        total: { type: 'integer', example: 25 },
                        page: { type: 'integer', example: 1 },
                        limit: { type: 'integer', example: 10 },
                        totalPages: { type: 'integer', example: 3 },
                      },
                    },
                  },
                },
              },
            },
          },
          403: { description: 'Forbidden — not your farmer ID and not an admin' },
        },
      },
    },
    '/api/payments/vet/{vetId}': {
      get: {
        tags: ['Payments'],
        summary: 'Get all payments associated with a specific vet',
        description: 'Returns a paginated list of all payments where the vet was the assigned vet on the service request. Accessible by the vet themselves or an admin.',
        security: [{ bearerAuth: [] }],
        parameters: [
          { name: 'vetId', in: 'path', required: true, schema: { type: 'string' }, example: 'clx1vet0000001' },
          { name: 'page', in: 'query', required: false, schema: { type: 'integer', default: 1 }, example: 1 },
          { name: 'limit', in: 'query', required: false, schema: { type: 'integer', default: 10 }, example: 10 },
        ],
        responses: {
          200: {
            description: 'Paginated list of payments for the vet',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    payments: {
                      type: 'array',
                      items: { $ref: '#/components/schemas/PaymentWithNames' },
                    },
                    pagination: {
                      type: 'object',
                      properties: {
                        total: { type: 'integer', example: 25 },
                        page: { type: 'integer', example: 1 },
                        limit: { type: 'integer', example: 10 },
                        totalPages: { type: 'integer', example: 3 },
                      },
                    },
                  },
                },
              },
            },
          },
          403: { description: 'Forbidden — not your vet ID and not an admin' },
        },
      },
    },
    '/api/subscriptions/packages': {
      get: {
        tags: ['Subscriptions'],
        summary: 'Get all available subscription packages',
        parameters: [
          { name: 'all', in: 'query', required: false, schema: { type: 'boolean' }, example: false, description: 'Pass true to include disabled packages (Admin)' },
        ],
        responses: { 200: { description: 'List of subscription packages' } },
      },
      post: {
        tags: ['Subscriptions'],
        summary: 'Admin create a new subscription package',
        security: [{ bearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['name', 'description', 'price', 'durationDays'],
                properties: {
                  name: { type: 'string', example: 'Pro Farmer Monthly' },
                  description: { type: 'string', example: 'Priority vet matching, unlimited service requests, and 10% discount on callout fees.' },
                  price: { type: 'number', example: 500 },
                  durationDays: { type: 'integer', example: 30 },
                },
              },
            },
          },
        },
        responses: { 201: { description: 'Package created' } },
      },
    },
    '/api/subscriptions/packages/{id}': {
      patch: {
        tags: ['Subscriptions'],
        summary: 'Admin update a subscription package',
        security: [{ bearerAuth: [] }],
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
        requestBody: {
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  name: { type: 'string', example: 'Pro Farmer Monthly' },
                  description: { type: 'string', example: 'Updated package description' },
                  price: { type: 'number', example: 600 },
                  durationDays: { type: 'integer', example: 30 },
                  isActive: { type: 'boolean', example: true },
                },
              },
            },
          },
        },
        responses: { 200: { description: 'Package updated' } },
      },
      delete: {
        tags: ['Subscriptions'],
        summary: 'Admin delete a subscription package',
        security: [{ bearerAuth: [] }],
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
        responses: { 200: { description: 'Package deleted' } },
      },
    },
    '/api/subscriptions/packages/{id}/toggle-active': {
      patch: {
        tags: ['Subscriptions'],
        summary: 'Admin toggle active status of a subscription package',
        security: [{ bearerAuth: [] }],
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
        requestBody: {
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: { isActive: { type: 'boolean', example: false } },
              },
            },
          },
        },
        responses: { 200: { description: 'Package active state updated' } },
      },
    },
    '/api/subscriptions/subscribe-stk': {
      post: {
        tags: ['Subscriptions'],
        summary: 'Farmer subscribe or renew a package via STK push',
        security: [{ bearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['packageId', 'phone'],
                properties: {
                  packageId: { type: 'string', example: 'pkg-cuid-123' },
                  phone: { type: 'string', example: '254796598108' },
                },
              },
            },
          },
        },
        responses: { 201: { description: 'STK push initiated and pending subscription created' } },
      },
    },
    '/api/farmer/subscriptions/my': {
      get: {
        tags: ['Subscriptions'],
        summary: 'Farmer get all subscribed packages and expiry details',
        security: [{ bearerAuth: [] }],
        responses: { 200: { description: 'List of farmer subscriptions' } },
      },
    },
    '/api/admin/subscriptions': {
      get: {
        tags: ['Subscriptions'],
        summary: 'Admin get all farmer subscriptions across the platform',
        security: [{ bearerAuth: [] }],
        responses: { 200: { description: 'List of all farmer subscriptions' } },
      },
    },
    '/api/vet/requests/{id}/capture-image': {
      post: {
        tags: ['Uploads'],
        summary: 'Upload a capture image for a request',
        security: [{ bearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            'multipart/form-data': {
              schema: {
                type: 'object',
                required: ['image'],
                properties: {
                  image: { type: 'string', format: 'binary' },
                  type: { type: 'string', enum: ['livestock', 'crop'], example: 'livestock' },
                  notes: { type: 'string', example: 'Swollen leg observed' },
                },
              },
            },
          },
        },
        responses: { 201: { description: 'Image capture stored' } },
      },
    },
    '/api/admin/dashboard/summary': {
      get: {
        tags: ['Admin'],
        summary: 'Get admin dashboard summary',
        security: [{ bearerAuth: [] }],
        responses: { 200: { description: 'Dashboard summary' } },
      },
    },
    '/api/admin/dashboard/top-vets': {
      get: {
        tags: ['Admin'],
        summary: 'Get top vets report',
        security: [{ bearerAuth: [] }],
        responses: { 200: { description: 'Top vets report' } },
      },
    },
    '/api/admin/dashboard/requests-by-county': {
      get: {
        tags: ['Admin'],
        summary: 'Get request counts by county',
        security: [{ bearerAuth: [] }],
        responses: { 200: { description: 'County breakdown' } },
      },
    },
    '/api/admin/reports/earnings-per-vet': {
      get: {
        tags: ['Admin'],
        summary: 'Get earnings per vet report',
        security: [{ bearerAuth: [] }],
        parameters: [
          { name: 'from', in: 'query', required: false, schema: { type: 'string', format: 'date-time' }, example: '2024-01-01T00:00:00.000Z' },
          { name: 'to', in: 'query', required: false, schema: { type: 'string', format: 'date-time' }, example: '2024-12-31T23:59:59.000Z' },
        ],
        responses: { 200: { description: 'Report' } },
      },
    },
    '/api/admin/reports/earnings-by-county': {
      get: {
        tags: ['Admin'],
        summary: 'Get earnings by county report',
        security: [{ bearerAuth: [] }],
        parameters: [
          { name: 'from', in: 'query', required: false, schema: { type: 'string', format: 'date-time' }, example: '2024-01-01T00:00:00.000Z' },
          { name: 'to', in: 'query', required: false, schema: { type: 'string', format: 'date-time' }, example: '2024-12-31T23:59:59.000Z' },
        ],
        responses: { 200: { description: 'Report' } },
      },
    },
    '/api/admin/vets': {
      get: {
        tags: ['Admin'],
        summary: 'List vets',
        security: [{ bearerAuth: [] }],
        parameters: [
          { name: 'status', in: 'query', required: false, schema: { type: 'string' }, example: 'approved' },
          { name: 'page', in: 'query', required: false, schema: { type: 'integer', default: 1 } },
          { name: 'limit', in: 'query', required: false, schema: { type: 'integer', default: 10 } },
        ],
        responses: {
          200: {
            description: 'Vets list',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    vets: { type: 'array', items: { $ref: '#/components/schemas/Vet' } },
                    pagination: {
                      type: 'object',
                      properties: {
                        total: { type: 'integer' },
                        page: { type: 'integer' },
                        limit: { type: 'integer' },
                        totalPages: { type: 'integer' },
                      },
                    },
                  },
                },
              },
            },
          },
        },
      },
    },
    '/api/admin/vets/{id}': {
      get: {
        tags: ['Admin'],
        summary: 'Get vet by ID',
        security: [{ bearerAuth: [] }],
        parameters: [
          { name: 'id', in: 'path', required: true, schema: { type: 'string' } },
        ],
        responses: { 200: { description: 'Vet details', content: { 'application/json': { schema: { $ref: '#/components/schemas/Vet' } } } } },
      },
    },
    '/api/admin/vets/{id}/status': {
      patch: {
        tags: ['Admin'],
        summary: 'Update vet status',
        security: [{ bearerAuth: [] }],
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['status'],
                properties: {
                  status: { type: 'string', enum: ['approved', 'suspended', 'pending_verification'], example: 'approved' },
                },
              },
            },
          },
        },
        responses: { 200: { description: 'Vet updated' } },
      },
    },
    '/api/admin/farmers': {
      get: {
        tags: ['Admin'],
        summary: 'List farmers',
        security: [{ bearerAuth: [] }],
        parameters: [
          { name: 'page', in: 'query', required: false, schema: { type: 'integer', default: 1 } },
          { name: 'limit', in: 'query', required: false, schema: { type: 'integer', default: 10 } },
        ],
        responses: { 200: { description: 'Farmers list' } },
      },
    },
    '/api/admin/service-requests': {
      get: {
        tags: ['Admin'],
        summary: 'List service requests',
        security: [{ bearerAuth: [] }],
        parameters: [
          { name: 'status', in: 'query', required: false, schema: { type: 'string' }, example: 'completed' },
          { name: 'county', in: 'query', required: false, schema: { type: 'string' }, example: 'Kiambu' },
          { name: 'page', in: 'query', required: false, schema: { type: 'integer', default: 1 } },
          { name: 'limit', in: 'query', required: false, schema: { type: 'integer', default: 10 } },
        ],
        responses: { 200: { description: 'Requests list' } },
      },
    },
    '/api/admin/service-requests/{id}': {
      get: {
        tags: ['Admin'],
        summary: 'Get service request details with images',
        security: [{ bearerAuth: [] }],
        parameters: [
          { name: 'id', in: 'path', required: true, schema: { type: 'string' } },
        ],
        responses: { 200: { description: 'Request details with capture images' } },
      },
    },
    '/api/admin/payments/all': {
      get: {
        tags: ['Admin'],
        summary: 'Get all payments across the platform',
        security: [{ bearerAuth: [] }],
        parameters: [
          { name: 'page', in: 'query', required: false, schema: { type: 'integer', default: 1 } },
          { name: 'limit', in: 'query', required: false, schema: { type: 'integer', default: 10 } },
        ],
        responses: { 200: { description: 'All payments list' } },
      },
    },
    '/api/admin/deposits/stats': {
      get: {
        tags: ['Admin'],
        summary: 'Get deposit statistics (total, today, completed, failed)',
        security: [{ bearerAuth: [] }],
        responses: { 200: { description: 'Deposit stats', content: { 'application/json': { schema: { $ref: '#/components/schemas/DepositStats' } } } } },
      },
    },
    '/api/admin/deposits': {
      get: {
        tags: ['Admin'],
        summary: 'List all wallet deposits with filters',
        security: [{ bearerAuth: [] }],
        parameters: [
          { name: 'status', in: 'query', required: false, schema: { type: 'string', enum: ['pending', 'success', 'failed'] } },
          { name: 'farmerId', in: 'query', required: false, schema: { type: 'string' } },
          { name: 'page', in: 'query', required: false, schema: { type: 'integer', default: 1 } },
          { name: 'limit', in: 'query', required: false, schema: { type: 'integer', default: 10 } },
        ],
        responses: { 200: { description: 'Paginated deposits list' } },
      },
    },
    '/api/reference/counties': {
      get: {
        tags: ['Reference'],
        summary: 'Get county and sub-county reference data',
        responses: { 200: { description: 'Reference data' } },
      },
    },
  },
  components: {
    securitySchemes: {
      bearerAuth: {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
      },
    },
    schemas: {
      Vet: {
        type: 'object',
        properties: {
          id: { type: 'string', example: 'clx1vet0000001' },
          fullName: { type: 'string', example: 'Dr. Achieng' },
          idNumber: { type: 'string', example: '30000001' },
          phone: { type: 'string', example: '254700000001' },
          county: { type: 'string', example: 'Kiambu' },
          subCounty: { type: 'string', example: 'Ruiru' },
          status: { type: 'string', enum: ['pending_verification', 'approved', 'suspended'], example: 'approved' },
          rating: { type: 'number', nullable: true, example: 4.5 },
          profileImageUrl: { type: 'string', nullable: true, description: 'Base64 data URL of the vet passport photo', example: 'data:image/jpeg;base64,/9j/4AAQSkZJRgABAQ...' },
          createdAt: { type: 'string', format: 'date-time' },
        },
      },
      VetPublic: {
        type: 'object',
        properties: {
          id: { type: 'string', example: 'clx1vet0000001' },
          fullName: { type: 'string', example: 'Dr. Achieng' },
          county: { type: 'string', example: 'Kiambu' },
          subCounty: { type: 'string', example: 'Ruiru' },
          status: { type: 'string', enum: ['pending_verification', 'approved', 'suspended'], example: 'approved' },
          rating: { type: 'number', nullable: true, example: 4.5 },
          profileImageUrl: { type: 'string', nullable: true, description: 'Base64 data URL of the vet passport photo', example: 'data:image/jpeg;base64,/9j/4AAQSkZJRgABAQ...' },
          createdAt: { type: 'string', format: 'date-time' },
        },
      },
      DepositStats: {
        type: 'object',
        properties: {
          totalDeposit: { type: 'number', example: 50000 },
          todayDeposit: { type: 'number', example: 5000 },
          completedDeposit: { type: 'number', example: 45000 },
          failedDeposit: { type: 'number', example: 5000 },
          todayCompleted: { type: 'number', example: 4500 },
          todayFailed: { type: 'number', example: 500 },
        },
      },
      Deposit: {
        type: 'object',
        properties: {
          id: { type: 'string' },
          walletId: { type: 'string' },
          type: { type: 'string', example: 'deposit' },
          amount: { type: 'number', example: 1000 },
          status: { type: 'string', enum: ['pending', 'success', 'failed'] },
          checkoutRequestId: { type: 'string', nullable: true },
          mpesaReceiptNumber: { type: 'string', nullable: true },
          description: { type: 'string', example: 'Wallet deposit' },
          farmerId: { type: 'string' },
          createdAt: { type: 'string', format: 'date-time' },
          completedAt: { type: 'string', format: 'date-time', nullable: true },
        },
      },
      Payment: {
        type: 'object',
        properties: {
          id: { type: 'string', example: 'clx1pay0000001' },
          requestId: { type: 'string', example: '670873d0-c6bd-4e02-860f-30598645bf19' },
          farmerId: { type: 'string', example: 'clx1farmer001' },
          vetId: { type: 'string', nullable: true, example: 'clx1vet0000001' },
          amount: { type: 'number', example: 1500 },
          phone: { type: 'string', example: '254796598108' },
          status: { type: 'string', enum: ['pending', 'success', 'failed'], example: 'pending' },
          mpesaReceiptNumber: { type: 'string', nullable: true, example: 'QHX7YYZ123' },
          checkoutRequestId: { type: 'string', nullable: true, example: 'MOCK-abc-123' },
          createdAt: { type: 'string', format: 'date-time', example: '2026-08-03T08:00:00.000Z' },
          completedAt: { type: 'string', format: 'date-time', nullable: true, example: null },
        },
      },
      PaymentWithNames: {
        allOf: [
          { $ref: '#/components/schemas/Payment' },
          {
            type: 'object',
            properties: {
              farmerName: { type: 'string', example: 'Jane Wanjiku' },
              vetName: { type: 'string', nullable: true, example: 'Dr. Achieng' },
            },
          },
        ],
      },
      SubscriptionPackage: {
        type: 'object',
        properties: {
          id: { type: 'string', example: 'clx1pkg0000001' },
          name: { type: 'string', example: 'Pro Farmer Monthly' },
          description: { type: 'string', example: 'Priority vet matching, unlimited requests, and 10% discount on callout fees.' },
          price: { type: 'number', example: 500 },
          durationDays: { type: 'integer', example: 30 },
          isActive: { type: 'boolean', example: true },
          createdAt: { type: 'string', format: 'date-time' },
          updatedAt: { type: 'string', format: 'date-time' },
        },
      },
      FarmerSubscription: {
        type: 'object',
        properties: {
          id: { type: 'string', example: 'clx1sub0000001' },
          farmerId: { type: 'string', example: 'clx1farmer001' },
          packageId: { type: 'string', example: 'clx1pkg0000001' },
          packageName: { type: 'string', example: 'Pro Farmer Monthly' },
          packageDescription: { type: 'string', example: 'Priority vet matching...' },
          amount: { type: 'number', example: 500 },
          durationDays: { type: 'integer', example: 30 },
          startDate: { type: 'string', format: 'date-time', nullable: true },
          endDate: { type: 'string', format: 'date-time', nullable: true },
          status: { type: 'string', enum: ['pending', 'active', 'expired', 'cancelled'], example: 'active' },
          checkoutRequestId: { type: 'string', nullable: true },
          createdAt: { type: 'string', format: 'date-time' },
        },
      },
    },
  },
};

export function setupSwagger(app: Express) {
  app.use('/docs', swaggerUi.serve, swaggerUi.setup(swaggerDocument));
}
