// frontend/apps/customer/src/App.jsx
import React, { useState } from 'react';
import { BrowserRouter as Router, Routes, Route, Link } from 'react-router-dom';
import { Container, Navbar, Nav, Button, Card } from 'react-bootstrap';
import 'bootstrap/dist/css/bootstrap.min.css';

// Pages
const HomePage = () => {
  const [isLoggedIn, setIsLoggedIn] = useState(false);

  return (
    <div className="home-page">
      <div className="hero-section text-center py-5 bg-primary text-white">
        <h1 className="display-4">🚖 CAB Booking System</h1>
        <p className="lead">Book a taxi in seconds. Track your ride in real-time.</p>
        <Button variant="light" size="lg" className="mt-3">
          {isLoggedIn ? 'Book Now' : 'Get Started'}
        </Button>
      </div>

      <Container className="py-5">
        <div className="row text-center">
          <div className="col-md-4 mb-4">
            <Card>
              <Card.Body>
                <Card.Title>📱 Easy Booking</Card.Title>
                <Card.Text>Book a ride with just a few taps</Card.Text>
              </Card.Body>
            </Card>
          </div>
          <div className="col-md-4 mb-4">
            <Card>
              <Card.Body>
                <Card.Title>📍 Real-time Tracking</Card.Title>
                <Card.Text>Track your driver live on the map</Card.Text>
              </Card.Body>
            </Card>
          </div>
          <div className="col-md-4 mb-4">
            <Card>
              <Card.Body>
                <Card.Title>💳 Secure Payment</Card.Title>
                <Card.Text>Multiple payment options</Card.Text>
              </Card.Body>
            </Card>
          </div>
        </div>
      </Container>
    </div>
  );
};

const LoginPage = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const handleLogin = async () => {
    try {
      // TODO: Connect to actual auth service
      console.log('Logging in with:', { email, password });
      alert('Login functionality will be implemented soon!');
    } catch (error) {
      console.error('Login error:', error);
    }
  };

  return (
    <Container className="mt-5" style={{ maxWidth: '400px' }}>
      <h2 className="text-center mb-4">Login to CAB Booking</h2>
      <div className="mb-3">
        <label className="form-label">Email</label>
        <input
          type="email"
          className="form-control"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="Enter your email"
        />
      </div>
      <div className="mb-3">
        <label className="form-label">Password</label>
        <input
          type="password"
          className="form-control"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="Enter your password"
        />
      </div>
      <Button variant="primary" className="w-100" onClick={handleLogin}>
        Login
      </Button>
      <p className="text-center mt-3">
        Don't have an account? <Link to="/register">Register</Link>
      </p>
    </Container>
  );
};

// Navigation Component
const Navigation = () => (
  <Navbar bg="dark" variant="dark" expand="lg">
    <Container>
      <Navbar.Brand as={Link} to="/">🚖 CAB Booking</Navbar.Brand>
      <Nav className="ms-auto">
        <Nav.Link as={Link} to="/">Home</Nav.Link>
        <Nav.Link as={Link} to="/login">Login</Nav.Link>
        <Nav.Link as={Link} to="/register">Register</Nav.Link>
        <Nav.Link as={Link} to="/book">Book Ride</Nav.Link>
      </Nav>
    </Container>
  </Navbar>
);

// Main App Component
function App() {
  return (
    <Router>
      <Navigation />
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<LoginPage />} {/* Temporary */} />
        <Route path="/book" element={
          <Container className="mt-5">
            <h2>Book a Ride</h2>
            <p>Booking functionality coming soon!</p>
          </Container>
        } />
      </Routes>
    </Router>
  );
}

export default App;