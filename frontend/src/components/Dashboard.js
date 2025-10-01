import React, { useState, useEffect } from 'react';
import { Container, Row, Col, Card, Alert } from 'react-bootstrap';

function Dashboard() {
  const [stats, setStats] = useState({
    activeProjects: 0,
    activeSessions: 0,
    targetChannels: 0,
    messagesSent: 0
  });
  const [recentActivity, setRecentActivity] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchStats();
    fetchRecentActivity();
  }, []);

  const fetchStats = async () => {
    try {
      // In a real implementation, this would come from an API endpoint
      // For now, we'll return mock data
      setStats({
        activeProjects: 5,
        activeSessions: 3,
        targetChannels: 24,
        messagesSent: 1245
      });
    } catch (err) {
      setError('Failed to load statistics: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const fetchRecentActivity = async () => {
    try {
      // In a real implementation, this would come from an API endpoint
      // For now, we'll return mock data
      setRecentActivity([
        { id: 1, type: 'project_started', project: 'Promotion Campaign', time: '2 minutes ago' },
        { id: 2, type: 'message_sent', target: 'Channel A', time: '10 minutes ago' },
        { id: 3, type: 'session_added', session: 'Session 1', time: '1 hour ago' },
        { id: 4, type: 'file_uploaded', file: 'promo_images.zip', time: '2 hours ago' }
      ]);
    } catch (err) {
      setError('Failed to load activity: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <Container><p>Loading dashboard...</p></Container>;

  return (
    <Container>
      <h1>Dashboard</h1>
      <p>Welcome to the Telegram Campaign Manager</p>
      
      {error && <Alert variant="danger">{error}</Alert>}
      
      <Row>
        <Col md={3}>
          <Card className="text-center">
            <Card.Body>
              <Card.Title>Active Projects</Card.Title>
              <Card.Text className="display-4">{stats.activeProjects}</Card.Text>
            </Card.Body>
          </Card>
        </Col>
        <Col md={3}>
          <Card className="text-center">
            <Card.Body>
              <Card.Title>Active Sessions</Card.Title>
              <Card.Text className="display-4">{stats.activeSessions}</Card.Text>
            </Card.Body>
          </Card>
        </Col>
        <Col md={3}>
          <Card className="text-center">
            <Card.Body>
              <Card.Title>Target Channels</Card.Title>
              <Card.Text className="display-4">{stats.targetChannels}</Card.Text>
            </Card.Body>
          </Card>
        </Col>
        <Col md={3}>
          <Card className="text-center">
            <Card.Body>
              <Card.Title>Messages Sent</Card.Title>
              <Card.Text className="display-4">{stats.messagesSent}</Card.Text>
            </Card.Body>
          </Card>
        </Col>
      </Row>
      
      <Row className="mt-4">
        <Col>
          <Card>
            <Card.Header>
              <h5>Recent Activity</h5>
            </Card.Header>
            <Card.Body>
              {recentActivity.length > 0 ? (
                <ul className="list-group list-group-flush">
                  {recentActivity.map(activity => (
                    <li key={activity.id} className="list-group-item d-flex justify-content-between align-items-start">
                      <div className="ms-2 me-auto">
                        <div className="fw-bold">{activity.type.replace('_', ' ').toUpperCase()}</div>
                        {activity.project || activity.target || activity.session || activity.file}
                      </div>
                      <span className="badge bg-primary rounded-pill">{activity.time}</span>
                    </li>
                  ))}
                </ul>
              ) : (
                <p>No recent activity to display</p>
              )}
            </Card.Body>
          </Card>
        </Col>
      </Row>
    </Container>
  );
}

export default Dashboard;