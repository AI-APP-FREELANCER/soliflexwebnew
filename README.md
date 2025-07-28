# Soliflex - Professional Logistics Management System

A comprehensive logistics management system built with React.js frontend and Node.js backend.

## Features

- **Order Management**: Create and track RFQs (Request for Quotations)
- **Vehicle Allocation**: Intelligent truck allocation based on weight and capacity
- **Approval Workflow**: Multi-stage approval process with role-based access
- **Real-time Tracking**: Monitor order status and vehicle movements
- **Analytics Dashboard**: Comprehensive reporting and analytics

## Tech Stack

- **Frontend**: React.js, Material-UI (MUI)
- **Backend**: Node.js, Express.js
- **Database**: Excel-based data storage (backend.xlsx)
- **Process Manager**: PM2

## Installation

### Prerequisites
- Node.js (v14 or higher)
- npm or yarn

### Setup

1. **Clone the repository**
   ```bash
   git clone <your-repository-url>
   cd soliflex-logistics-app
   ```

2. **Install dependencies**
   ```bash
   # Install backend dependencies
   npm install
   
   # Install frontend dependencies
   cd frontend
   npm install
   cd ..
   ```

3. **Start the application**
   ```bash
   # Start backend
   npm start
   
   # In another terminal, start frontend
   cd frontend
   npm start
   ```

## PM2 Deployment

### Start with PM2
```bash
# Start backend
pm2 start server.js --name "backend"

# Start frontend
pm2 start npm --name "frontend" -- start
```

### PM2 Commands
```bash
# Check status
pm2 status

# View logs
pm2 logs

# Restart
pm2 restart all

# Stop
pm2 stop all

# Save configuration
pm2 save
pm2 startup
```

## Role-Based Access Control

- **Admin**: Full access to all features
- **Purchase Team**: Create RFQs and approve orders
- **Security**: Approve vehicle entry/exit stages
- **Stores**: Approve consignment verification stages

## API Endpoints

- `POST /api/auth/login` - User authentication
- `POST /api/auth/register` - User registration
- `POST /api/orders` - Create new RFQ
- `GET /api/orders` - Get all orders
- `PUT /api/orders/:id/stages/:stageId` - Approve/reject stages
- `POST /api/trucks/suggest` - Get truck suggestions

## File Structure

```
soliflex-clean/
├── frontend/           # React.js frontend
│   ├── src/
│   │   ├── components/ # React components
│   │   ├── App.js      # Main app component
│   │   └── index.js    # Entry point
│   ├── package.json
│   └── public/
├── server.js           # Express.js backend
├── package.json        # Backend dependencies
├── backend.xlsx        # Data storage
└── README.md
```

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Submit a pull request

## License

This project is proprietary software for Soliflex Logistics. 