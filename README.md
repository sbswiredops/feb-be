# Coupon Redemption Backend

A NestJS backend application for coupon redemption with Perplexity-based authentication, PostgreSQL integration, and comprehensive Swagger documentation.

## Features

- **Coupon Redemption System**: Users redeem coupons via unique UUID links
- **Perplexity Integration**: Automatic login email/code sending via Perplexity API
- **US Proxy Support**: All Perplexity API calls routed through US proxy
- **Admin Panel**: Complete admin interface for coupon management
- **Comprehensive Logging**: All actions logged with detailed information
- **Swagger Documentation**: Full API documentation at `/docs`
- **PostgreSQL Integration**: Robust database schema with proper constraints
- **JWT Authentication**: Secure admin authentication

## Environment Variables

Create a `.env` file in the root directory with the following variables:

```bash
DATABASE_URL=postgresql://username:password@localhost:5432/coupon_db
PORT=3000
PERPLEXITY_API_KEY=your_perplexity_api_key_here
PERPLEXITY_API_BASE=https://api.perplexity.ai
HTTP_PROXY=http://your-us-proxy:port
NODE_ENV=development
JWT_SECRET=your_jwt_secret_here
```

## Database Setup

1. Create a PostgreSQL database
2. Run the initialization script:

```bash
psql -d your_database_url -f database/init.sql
```

Or use the provided SQL script to set up tables and sample data.

## Installation

```bash
npm install
```

## Running the Application

```bash
# Development mode
npm run start:dev

# Production mode
npm run build
npm run start:prod
```

## API Documentation

Once the application is running, visit:
- **Swagger UI**: `http://localhost:3000/docs`
- **API Base**: `http://localhost:3000`

## API Endpoints

### Public Endpoints

#### POST /redeem
Redeem a coupon and trigger Perplexity login email.

```bash
curl -X POST http://localhost:3000/redeem \
  -H "Content-Type: application/json" \
  -d '{
    "email": "user@example.com",
    "uuid": "750b8a33-9d1b-4726-a812-2cfc8dafbd67"
  }'
```

### Admin Endpoints (Require JWT Authentication)

#### POST /admin/login
Authenticate admin user.

```bash
curl -X POST http://localhost:3000/admin/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "admin@example.com",
    "password": "admin123"
  }'
```

#### GET /admin/coupons
List all coupons (requires JWT token).

#### POST /admin/add-coupon
Add a new coupon.

#### POST /admin/reset-coupon
Reset a coupon to unused status.

## Database Schema

### Users Table
- `id`: UUID primary key
- `email`: Unique admin email
- `password_hash`: Bcrypt hashed password
- `role`: Always 'admin'
- `created_at`: Timestamp

### Coupons Table
- `uuid`: UUID primary key
- `code`: Unique coupon code
- `status`: 'unused', 'used', or 'unvalid'
- `assigned_email`: Email when redeemed
- `assigned_at`: Assignment timestamp
- `used_at`: Usage timestamp
- `created_at`: Creation timestamp

### Logs Table
- `id`: UUID primary key
- `action`: Action type
- `details`: JSON details
- `created_at`: Timestamp

## Proxy Configuration

All Perplexity API calls are automatically routed through the configured US proxy:

1. Set `HTTP_PROXY` environment variable
2. The application uses `https-proxy-agent` for proxy support
3. All requests to Perplexity API will use the proxy regardless of user location

## Admin User Creation

Create an admin user using the script:

```bash
npm run create-admin admin@example.com securepassword123
```

## Logging

All actions are logged to the database:
- Coupon redemption attempts
- Admin login attempts
- Coupon management actions
- API call results

## Security Features

- JWT-based admin authentication
- Password hashing with bcrypt
- Input validation with class-validator
- SQL injection protection via TypeORM
- CORS configuration
- Environment variable protection

## Error Handling

The API provides detailed error responses:
- Invalid coupon UUID
- Already redeemed coupons
- Expired/invalid coupons
- Perplexity API failures
- Authentication errors

## Development

```bash
# Watch mode
npm run start:dev

# Debug mode
npm run start:debug

# Linting
npm run lint

# Formatting
npm run format
```

## Testing

```bash
# Unit tests
npm run test

# E2E tests
npm run test:e2e

# Test coverage
npm run test:cov
```

## Production Deployment

1. Set `NODE_ENV=production`
2. Configure production database
3. Set secure JWT secret
4. Configure production proxy
5. Build and run:

```bash
npm run build
npm run start:prod
```

## Monitoring

- Check application logs for errors
- Monitor database performance
- Track Perplexity API success rates
- Review coupon redemption patterns

## Troubleshooting

### Common Issues

1. **Database Connection**: Verify DATABASE_URL format
2. **Proxy Issues**: Test HTTP_PROXY connectivity
3. **Perplexity API**: Verify API key and base URL
4. **JWT Issues**: Check JWT_SECRET configuration

### Debug Mode

```bash
npm run start:debug
```

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make changes with tests
4. Submit a pull request

## License

This project is licensed under the MIT License.

## Support

For support and questions, please check the API documentation at `/docs` or review the application logs.

## API Flow Example

1. User visits: `http://mydomain.com/750b8a33-9d1b-4726-a812-2cfc8dafbd67`
2. Frontend shows modal for email input
3. POST to `/redeem` with email and UUID
4. Backend validates coupon and sends Perplexity login email via US proxy
5. User receives Perplexity sign-in email with code/link
6. All actions logged to database

## Architecture Notes

- **Modular Design**: Separate controllers, services, and entities
- **Database First**: PostgreSQL with TypeORM
- **Security**: JWT authentication for admin endpoints
- **Logging**: Comprehensive audit trail
- **Documentation**: Auto-generated Swagger docs
- **Proxy Support**: US-based API routing
- **Error Handling**: Graceful error responses
- **Validation**: Input validation with decorators

This backend provides a complete coupon redemption system with enterprise-grade features and comprehensive documentation.

Nest is [MIT licensed](https://github.com/nestjs/nest/blob/master/LICENSE).
