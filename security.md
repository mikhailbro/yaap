#Security

## General Requirements
- API Security purely relies on OAuth 2.0
- User management within yaap:
  - must not be mandatory, external user management must be possible
  - must be possible in yaap for scenarios with no external user management
- Roles must be part of the Access Token

## Authorization / multi tenancy
- Role-based security 
- The following roles exist 
  - admin (global)
  - api-owner (per tenant)
  - api-consumer (per tenant)
  - tenant-admin (per tenant), maybe used in the future
- Each API belongs to a tenant and sets its visibiliy (i.e. for which tenants is the API visible, incl. public)
- API owners can manage all APIs visible for their tenant
- API consumers can see and register to all APIs visible for their tenant AND public apis

## Access Token
- Must be Bearer Token in Authorizaton Header (later configurable)
- Must be a signed JWT (for testing purpose HS256 with pw 'secret', later RS256)
- JWT Payload:
```
{
  "sub": "1234567890",
  "name": "John Doe",
  "roles": {
    "admin": true,
    "apiOwner": ["api-owner_tenant-1"],
    "apiConsumer": ["api-consumer_tenant-1"],
    "tenantAdmin": ["tenant-admin_tenant-1"]
  }
}
```
