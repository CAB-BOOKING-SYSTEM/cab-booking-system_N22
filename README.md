# 🚖 CAB Booking System - IUH Project

## 📋 Project Overview
**Complete taxi booking platform with microservices architecture**
- **Real-time** driver tracking & matching
- **AI-powered** pricing & matching algorithms  
- **Zero Trust** security architecture
- **Cloud-native** deployment ready

## 👥 Team Information
**University:** Industrial University of Ho Chi Minh City (IUH)  
**Course:** Big Data 
**Team:** N22
**Members:** 10  

22632631	Nguyễn Minh Anh	Product Owner (PO) plays the role of Business Analyst (BA)
22636941	Nguyễn Võ Ngọc My 	Scrum Master (SM)
22718451	Nguyễn Hoàng Khang	Software System Architecture Designer (SSAD)
21123091	Ân Hiền Bảo Phúc	AI Engineer
22001645	Hồ Quốc Huy	DevOps Engineer
22723701	Trương Vỹ Hào	Cloud Engineer
22633661	Lê Thị Thanh Thảo 	UI/UX Designer
22716341	Cao Thành Đông	Software Quality Assurance, Quality Control (SQA/QC) and Tester
22663151	Nguyễn Mai Đình	Cyber Security Engineer
22665381	Lê Thị Hiền 	Software Engineer

## 🏗️ System Architecture
cab-booking-system/
├── backend/              # Backend microservices
│   ├── services/         # Individual services
│   └── shared/           # Shared utilities
├── frontend/             # Frontend applications
│   ├── apps/             # Customer, Driver, Admin apps
│   └── shared/           # Shared components
├── infrastructure/       # DevOps & deployment
├── ai-ml/               # AI/ML models
├── docs/                # Documentation
├── tests/               # Test suites
└── scripts/             # Utility scripts

## 🚀 Quick Start

### Prerequisites
- Node.js 18+
- Docker & Docker Compose
- PostgreSQL, MongoDB, Redis

### Development
```bash
# Clone repository
git clone https://github.com/[tên-organization]/cab-booking-system.git

# Install dependencies
cd cab-booking-system
npm install

# Run with Docker
docker-compose up -d

# Access services
# Frontend: http://localhost:3000
# Backend API: http://localhost:3001
# API Docs: http://localhost:3001/api-docs
