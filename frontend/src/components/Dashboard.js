import React, { useState, useEffect } from 'react';
import { Container, Row, Col, Card, Alert, Badge, ProgressBar, Spinner } from 'react-bootstrap';
import axios from 'axios';

function Dashboard() {
  const [stats, setStats] = useState(null);
  const [runningProjects, setRunningProjects] = useState([]);
  const [recentRuns, setRecentRuns] = useState([]);
  const [recentActivity, setRecentActivity] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchAllData();
    
    // Auto-refresh every 5 seconds
    const interval = setInterval(() => {
      fetchAllData();
    }, 5000);
    
    return () => clearInterval(interval);
  }, []);

  const fetchAllData = async () => {
    try {
      await Promise.all([
        fetchStats(),
        fetchRunningProjects(),
        fetchRecentRuns(),
        fetchRecentActivity()
      ]);
    } catch (err) {
      console.error('Error fetching dashboard data:', err);
    }
  };

  const fetchStats = async () => {
    try {
      const response = await axios.get('/api/dashboard/stats');
      if (response.data.success) {
        setStats(response.data.data);
      }
    } catch (err) {
      console.error('Failed to load statistics:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchRunningProjects = async () => {
    try {
      const response = await axios.get('/api/dashboard/running-projects');
      if (response.data.success) {
        setRunningProjects(response.data.data);
      }
    } catch (err) {
      console.error('Failed to load running projects:', err);
    }
  };

  const fetchRecentRuns = async () => {
    try {
      const response = await axios.get('/api/dashboard/recent-runs?limit=5');
      if (response.data.success) {
        setRecentRuns(response.data.data);
      }
    } catch (err) {
      console.error('Failed to load recent runs:', err);
    }
  };

  const fetchRecentActivity = async () => {
    try {
      const response = await axios.get('/api/dashboard/recent-activity?limit=10');
      if (response.data.success) {
        setRecentActivity(response.data.data);
      }
    } catch (err) {
      console.error('Failed to load activity:', err);
    }
  };

  const formatTimeAgo = (dateString) => {
    if (!dateString) return 'Unknown';
    
    try {
      // SQLite datetime format: "YYYY-MM-DD HH:MM:SS" (already in local time from backend)
      // Parse as local time
      const date = new Date(dateString.replace(' ', 'T'));
      const now = new Date();
      const seconds = Math.floor((now - date) / 1000);
      
      if (seconds < 0) return 'Just now';
      if (seconds < 60) return `${seconds}s ago`;
      if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
      if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
      return `${Math.floor(seconds / 86400)}d ago`;
    } catch (err) {
      console.error('Error formatting time:', err);
      return dateString;
    }
  };

  if (loading || !stats) return (
    <Container className="text-center mt-5">
      <Spinner animation="border" role="status">
        <span className="visually-hidden">Loading...</span>
      </Spinner>
      <p className="mt-3">Loading dashboard...</p>
    </Container>
  );

  return (
    <Container fluid className="px-4">
      <div className="d-flex justify-content-between align-items-center mb-4">
        <div>
          <h1 className="mb-1">📊 Dashboard</h1>
          <p className="text-muted mb-0">Real-time overview of your Telegram campaigns</p>
        </div>
        <Badge bg="success" className="px-3 py-2">
          <Spinner animation="grow" size="sm" className="me-2" />
          Live
        </Badge>
      </div>
      
      {error && <Alert variant="danger">{error}</Alert>}
      
      {/* Statistics Cards */}
      <Row className="g-3 mb-4">
        <Col md={3}>
          <Card className="border-0 shadow-sm h-100">
            <Card.Body>
              <div className="d-flex justify-content-between align-items-start">
                <div>
                  <p className="text-muted mb-1 small">Projects</p>
                  <h2 className="mb-0">{stats.projects?.total || 0}</h2>
                </div>
                <div className="bg-primary bg-opacity-10 p-3 rounded">
                  <span style={{fontSize: '2rem'}}>📁</span>
                </div>
              </div>
              <div className="mt-3">
                <Badge bg="success" className="me-1">{stats.projects?.running || 0} running</Badge>
                <Badge bg="secondary">{stats.projects?.stopped || 0} stopped</Badge>
              </div>
            </Card.Body>
          </Card>
        </Col>
        
        <Col md={3}>
          <Card className="border-0 shadow-sm h-100">
            <Card.Body>
              <div className="d-flex justify-content-between align-items-start">
                <div>
                  <p className="text-muted mb-1 small">Sessions</p>
                  <h2 className="mb-0">{stats.sessions?.total || 0}</h2>
                </div>
                <div className="bg-success bg-opacity-10 p-3 rounded">
                  <span style={{fontSize: '2rem'}}>👤</span>
                </div>
              </div>
              <p className="text-muted small mb-0 mt-3">Active Telegram accounts</p>
            </Card.Body>
          </Card>
        </Col>
        
        <Col md={3}>
          <Card className="border-0 shadow-sm h-100">
            <Card.Body>
              <div className="d-flex justify-content-between align-items-start">
                <div>
                  <p className="text-muted mb-1 small">Channels</p>
                  <h2 className="mb-0">{stats.channels?.total || 0}</h2>
                </div>
                <div className="bg-info bg-opacity-10 p-3 rounded">
                  <span style={{fontSize: '2rem'}}>📢</span>
                </div>
              </div>
              <p className="text-muted small mb-0 mt-3">Target destinations</p>
            </Card.Body>
          </Card>
        </Col>
        
        <Col md={3}>
          <Card className="border-0 shadow-sm h-100">
            <Card.Body>
              <div className="d-flex justify-content-between align-items-start">
                <div>
                  <p className="text-muted mb-1 small">Files</p>
                  <h2 className="mb-0">{stats.files?.total || 0}</h2>
                </div>
                <div className="bg-warning bg-opacity-10 p-3 rounded">
                  <span style={{fontSize: '2rem'}}>📄</span>
                </div>
              </div>
              <div className="mt-3">
                <small className="text-muted">
                  {((stats.files?.total_size || 0) / 1024 / 1024).toFixed(2)} MB total
                </small>
              </div>
            </Card.Body>
          </Card>
        </Col>
      </Row>

      <Row className="g-3">
        {/* Running Projects */}
        <Col lg={6}>
          <Card className="border-0 shadow-sm h-100">
            <Card.Header className="bg-white border-0 pt-3">
              <h5 className="mb-0">🚀 Running Projects</h5>
            </Card.Header>
            <Card.Body style={{maxHeight: '400px', overflowY: 'auto'}}>
              {runningProjects.length > 0 ? (
                runningProjects.map(project => (
                  <div key={project.id} className="border-bottom pb-3 mb-3">
                    <div className="d-flex justify-content-between align-items-start">
                      <div className="flex-grow-1">
                        <h6 className="mb-1">{project.name}</h6>
                        <small className="text-muted">
                          Started {formatTimeAgo(project.started_at)}
                        </small>
                      </div>
                      <Badge bg="success">Running</Badge>
                    </div>
                    {project.stats && (
                      <div className="mt-2">
                        <div className="d-flex justify-content-between small mb-1">
                          <span>Progress</span>
                          <span>{project.stats.completed_jobs || 0}/{project.stats.total_jobs || 0}</span>
                        </div>
                        <ProgressBar 
                          now={((project.stats.completed_jobs || 0) / (project.stats.total_jobs || 1)) * 100}
                          variant="success"
                          style={{height: '8px'}}
                        />
                        <div className="mt-2 d-flex gap-2">
                          <Badge bg="success" className="small">{project.stats.success_count || 0} success</Badge>
                          <Badge bg="danger" className="small">{project.stats.error_count || 0} errors</Badge>
                        </div>
                      </div>
                    )}
                  </div>
                ))
              ) : (
                <div className="text-center text-muted py-4">
                  <p>No projects currently running</p>
                  <small>Start a project to see it here</small>
                </div>
              )}
            </Card.Body>
          </Card>
        </Col>

        {/* Recent Runs */}
        <Col lg={6}>
          <Card className="border-0 shadow-sm h-100">
            <Card.Header className="bg-white border-0 pt-3">
              <h5 className="mb-0">📜 Recent Runs</h5>
            </Card.Header>
            <Card.Body style={{maxHeight: '400px', overflowY: 'auto'}}>
              {recentRuns.length > 0 ? (
                recentRuns.map(run => (
                  <div key={run.id} className="border-bottom pb-3 mb-3">
                    <div className="d-flex justify-content-between align-items-start">
                      <div className="flex-grow-1">
                        <h6 className="mb-1">{run.project_name}</h6>
                        <small className="text-muted">
                          {formatTimeAgo(run.started_at)}
                        </small>
                      </div>
                      <Badge bg={run.status === 'completed' ? 'success' : run.status === 'running' ? 'primary' : 'secondary'}>
                        {run.status}
                      </Badge>
                    </div>
                    {run.stats && (
                      <div className="mt-2 d-flex gap-2">
                        <Badge bg="light" text="dark" className="small">
                          {run.stats.total_jobs || 0} jobs
                        </Badge>
                        <Badge bg="success" className="small">
                          {run.stats.success_count || 0} ✓
                        </Badge>
                        {run.stats.error_count > 0 && (
                          <Badge bg="danger" className="small">
                            {run.stats.error_count} ✗
                          </Badge>
                        )}
                      </div>
                    )}
                  </div>
                ))
              ) : (
                <div className="text-center text-muted py-4">
                  <p>No recent runs</p>
                </div>
              )}
            </Card.Body>
          </Card>
        </Col>
      </Row>

      {/* Recent Activity */}
      <Row className="mt-3">
        <Col>
          <Card className="border-0 shadow-sm">
            <Card.Header className="bg-white border-0 pt-3">
              <h5 className="mb-0">📝 Recent Activity</h5>
            </Card.Header>
            <Card.Body style={{maxHeight: '300px', overflowY: 'auto'}}>
              {recentActivity.length > 0 ? (
                <div className="list-group list-group-flush">
                  {recentActivity.map(activity => (
                    <div key={activity.id} className="list-group-item border-0 px-0">
                      <div className="d-flex justify-content-between align-items-start">
                        <div className="flex-grow-1">
                          <Badge bg={activity.level === 'error' ? 'danger' : activity.level === 'warning' ? 'warning' : 'info'} className="me-2">
                            {activity.level}
                          </Badge>
                          <span className="small">{activity.message}</span>
                        </div>
                        <small className="text-muted">{formatTimeAgo(activity.created_at)}</small>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center text-muted py-4">
                  <p>No recent activity</p>
                </div>
              )}
            </Card.Body>
          </Card>
        </Col>
      </Row>
    </Container>
  );
}

export default Dashboard;