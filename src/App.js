import React, { useState, useEffect } from 'react';
import { 
  AppBar, 
  Toolbar, 
  Typography, 
  Container, 
  Paper, 
  Grid, 
  Card, 
  CardContent, 
  List, 
  ListItem, 
  ListItemText, 
  Divider,
  Chip,
  CircularProgress,
  TextField,
  Button,
  Select,
  MenuItem,
  FormControl,
  InputLabel
} from '@material-ui/core';
import { 
  School as SchoolIcon, 
  Assignment as AssignmentIcon,
  Mood as MoodIcon,
  Event as EventIcon,
  AccessAlarm as MentorIcon
} from '@material-ui/icons';
import { Doughnut, Bar } from 'react-chartjs-2';
import axios from 'axios';

function App() {
  const [agentStatus, setAgentStatus] = useState({});
  const [student, setStudent] = useState(null);
  const [messages, setMessages] = useState([]);
  const [events, setEvents] = useState([]);
  const [lessonContent, setLessonContent] = useState([]);
  const [quizQuestion, setQuizQuestion] = useState(null);
  const [action, setAction] = useState('request-lesson');
  const [actionData, setActionData] = useState({});
  const [ws, setWs] = useState(null);

  // Initialize WebSocket connection
  useEffect(() => {
    const websocket = new WebSocket('ws://localhost:5000');
    setWs(websocket);

    websocket.onmessage = (event) => {
      const data = JSON.parse(event.data);
      
      switch (data.type) {
        case 'agent-status':
          setAgentStatus(data.data);
          break;
        case 'agent-message':
          setMessages(prev => [...prev, { agent: data.agent, message: data.message }]);
          break;
        case 'student-update':
          setStudent(prev => ({ ...prev, [data.field]: data.value }));
          break;
        case 'event-recommendations':
          setEvents(data.events);
          break;
        case 'lesson-content':
          setLessonContent(prev => [...prev, data.content]);
          break;
        case 'quiz-question':
          setQuizQuestion({
            question: data.question,
            options: data.options,
            questionId: data.questionId
          });
          break;
        case 'quiz-feedback':
          setMessages(prev => [...prev, { 
            agent: data.agent, 
            message: `Your answer was ${data.isCorrect ? 'correct' : 'incorrect'}. Score: ${Math.round(data.score.correct/data.score.total * 100)}%`
          }]);
          setQuizQuestion(null);
          break;
        default:
          console.log('Unknown message type:', data.type);
      }
    };

    // Initial data fetch
    axios.get('http://localhost:5000/api/agent-status')
      .then(response => setAgentStatus(response.data))
      .catch(error => console.error('Error fetching agent status:', error));

    // Initialize demo student
    setStudent({
      id: 'demo-student',
      name: 'Demo Student',
      courses: [],
      completedCourses: [],
      interests: ['ai', 'robotics'],
      stressLevel: 0,
      learningScores: {}
    });

    return () => websocket.close();
  }, []);

  const handleStudentAction = () => {
    axios.post('http://localhost:5000/api/student-action', {
      action,
      data: actionData
    }).catch(error => console.error('Error sending action:', error));
  };

  const handleQuizAnswer = (answer) => {
    axios.post('http://localhost:5000/api/student-action', {
      action: 'answer-quiz',
      data: {
        questionId: quizQuestion.questionId,
        answer
      }
    });
  };

  const renderAgentStatus = (agentName) => {
    const status = agentStatus[agentName] || 'unknown';
    const statusColor = status === 'idle' ? 'default' : 
                       status === 'working' ? 'primary' : 'secondary';
    
    const icons = {
      ProfessorAgent: <SchoolIcon />,
      RegistrarAgent: <AssignmentIcon />,
      CounselorAgent: <MoodIcon />,
      EventAgent: <EventIcon />,
      MentorAgent: <MentorIcon />
    };

    return (
      <ListItem>
        <ListItemText 
          primary={agentName} 
          secondary={`Status: ${status}`} 
        />
        <Chip 
          icon={icons[agentName]}
          label={status} 
          color={statusColor}
          variant="outlined"
        />
      </ListItem>
    );
  };

  const renderActionForm = () => {
    switch (action) {
      case 'request-course':
        return (
          <FormControl fullWidth>
            <InputLabel>Course</InputLabel>
            <Select
              value={actionData.course || ''}
              onChange={(e) => setActionData({ course: e.target.value })}
            >
              {Object.keys(COURSE_CATALOG).map(course => (
                <MenuItem key={course} value={course}>{course}</MenuItem>
              ))}
            </Select>
          </FormControl>
        );
      case 'request-lesson':
        return (
          <FormControl fullWidth>
            <InputLabel>Topic</InputLabel>
            <Select
              value={actionData.topic || ''}
              onChange={(e) => setActionData({ topic: e.target.value })}
            >
              {Object.keys(LESSON_TOPICS).map(topic => (
                <MenuItem key={topic} value={topic}>{topic}</MenuItem>
              ))}
            </Select>
          </FormControl>
        );
      case 'report-stress':
        return (
          <>
            <TextField
              fullWidth
              type="number"
              label="Stress Level (0-100)"
              value={actionData.level || ''}
              onChange={(e) => setActionData({ ...actionData, level: parseInt(e.target.value) })}
              margin="normal"
            />
            <TextField
              fullWidth
              label="Message"
              value={actionData.message || ''}
              onChange={(e) => setActionData({ ...actionData, message: e.target.value })}
              margin="normal"
            />
          </>
        );
      default:
        return null;
    }
  };

  // Sample data for UI
  const COURSE_CATALOG = {
    'AI Basics': { prerequisites: [], credits: 3 },
    'Machine Learning 101': { prerequisites: ['AI Basics'], credits: 4 },
    'Deep Learning': { prerequisites: ['Machine Learning 101'], credits: 4 }
  };

  const LESSON_TOPICS = {
    'AI Basics': 'Introduction to Artificial Intelligence',
    'Machine Learning 101': 'Fundamentals of Machine Learning'
  };

  const stressData = {
    labels: ['Stress Level'],
    datasets: [
      {
        label: 'Current Stress',
        data: [student?.stressLevel || 0],
        backgroundColor: ['rgba(255, 99, 132, 0.6)'],
        borderColor: ['rgba(255, 99, 132, 1)'],
        borderWidth: 1,
      }
    ]
  };

  const learningData = {
    labels: student ? Object.keys(student.learningScores) : [],
    datasets: [
      {
        label: 'Mastery %',
        data: student ? Object.values(student.learningScores).map(score => 
          Math.round((score.correct / score.total) * 100) : [],
        backgroundColor: 'rgba(54, 162, 235, 0.6)',
        borderColor: 'rgba(54, 162, 235, 1)',
        borderWidth: 1,
      }
    ]
  };

  return (
    <div className="App">
      <AppBar position="static">
        <Toolbar>
          <Typography variant="h6" style={{ flexGrow: 1 }}>
            AI Campus Adventure Dashboard
          </Typography>
          <Chip 
            label={student?.name || 'Student'} 
            color="secondary" 
            variant="outlined"
          />
        </Toolbar>
      </AppBar>

      <Container maxWidth="lg" style={{ marginTop: '20px' }}>
        <Grid container spacing={3}>
          {/* Left Column - Agent Status and Controls */}
          <Grid item xs={12} md={4}>
            <Paper elevation={3} style={{ padding: '20px', marginBottom: '20px' }}>
              <Typography variant="h6" gutterBottom>
                Agent Status
              </Typography>
              <List>
                {Object.keys(agentStatus).map(agentName => renderAgentStatus(agentName))}
              </List>
            </Paper>

            <Paper elevation={3} style={{ padding: '20px' }}>
              <Typography variant="h6" gutterBottom>
                Student Actions
              </Typography>
              <FormControl fullWidth style={{ marginBottom: '20px' }}>
                <InputLabel>Action</InputLabel>
                <Select
                  value={action}
                  onChange={(e) => setAction(e.target.value)}
                >
                  <MenuItem value="request-course">Register for Course</MenuItem>
                  <MenuItem value="request-lesson">Request Lesson</MenuItem>
                  <MenuItem value="report-stress">Report Stress</MenuItem>
                  <MenuItem value="request-events">Request Events</MenuItem>
                </Select>
              </FormControl>

              {renderActionForm()}

              <Button 
                variant="contained" 
                color="primary" 
                fullWidth 
                style={{ marginTop: '20px' }}
                onClick={handleStudentAction}
              >
                Submit Action
              </Button>
            </Paper>
          </Grid>

          {/* Middle Column - Student Info and Messages */}
          <Grid item xs={12} md={4}>
            <Paper elevation={3} style={{ padding: '20px', marginBottom: '20px' }}>
              <Typography variant="h6" gutterBottom>
                Student Information
              </Typography>
              {student ? (
                <>
                  <Typography><strong>Current Courses:</strong> {student.courses.join(', ') || 'None'}</Typography>
                  <Typography><strong>Completed Courses:</strong> {student.completedCourses.join(', ') || 'None'}</Typography>
                  <Typography><strong>Interests:</strong> {student.interests.join(', ')}</Typography>
                  
                  <div style={{ marginTop: '20px' }}>
                    <Typography variant="subtitle1">Stress Level</Typography>
                    <Bar 
                      data={stressData}
                      options={{
                        scales: {
                          y: {
                            beginAtZero: true,
                            max: 100
                          }
                        }
                      }}
                    />
                  </div>
                </>
              ) : (
                <CircularProgress />
              )}
            </Paper>

            <Paper elevation={3} style={{ padding: '20px' }}>
              <Typography variant="h6" gutterBottom>
                Learning Progress
              </Typography>
              {student && Object.keys(student.learningScores).length > 0 ? (
                <Doughnut 
                  data={learningData}
                  options={{
                    cutout: '70%',
                    plugins: {
                      legend: {
                        position: 'bottom'
                      }
                    }
                  }}
                />
              ) : (
                <Typography>No learning data yet. Take some quizzes!</Typography>
              )}
            </Paper>
          </Grid>

          {/* Right Column - Messages and Content */}
          <Grid item xs={12} md={4}>
            <Paper elevation={3} style={{ padding: '20px', marginBottom: '20px', height: '300px', overflow: 'auto' }}>
              <Typography variant="h6" gutterBottom>
                Agent Messages
              </Typography>
              <List>
                {messages.map((msg, index) => (
                  <React.Fragment key={index}>
                    <ListItem>
                      <ListItemText 
                        primary={msg.agent}
                        secondary={msg.message}
                      />
                    </ListItem>
                    {index < messages.length - 1 && <Divider />}
                  </React.Fragment>
                ))}
              </List>
            </Paper>

            <Paper elevation={3} style={{ padding: '20px', marginBottom: '20px', minHeight: '200px' }}>
              <Typography variant="h6" gutterBottom>
                Lesson Content
              </Typography>
              {lessonContent.length > 0 ? (
                <List>
                  {lessonContent.map((content, index) => (
                    <ListItem key={index}>
                      <ListItemText primary={content} />
                    </ListItem>
                  ))}
                </List>
              ) : (
                <Typography>No active lesson. Request a lesson to begin.</Typography>
              )}
            </Paper>

            {quizQuestion && (
              <Paper elevation={3} style={{ padding: '20px' }}>
                <Typography variant="h6" gutterBottom>
                  Quiz Question
                </Typography>
                <Typography style={{ marginBottom: '20px' }}>{quizQuestion.question}</Typography>
                <Grid container spacing={2}>
                  {quizQuestion.options.map(option => (
                    <Grid item xs={6} key={option}>
                      <Button 
                        variant="outlined" 
                        fullWidth
                        onClick={() => handleQuizAnswer(option)}
                      >
                        {option}
                      </Button>
                    </Grid>
                  ))}
                </Grid>
              </Paper>
            )}

            {events.length > 0 && (
              <Paper elevation={3} style={{ padding: '20px', marginTop: '20px' }}>
                <Typography variant="h6" gutterBottom>
                  Recommended Events
                </Typography>
                <List>
                  {events.map(event => (
                    <ListItem key={event.id}>
                      <ListItemText 
                        primary={event.title}
                        secondary={event.date}
                      />
                    </ListItem>
                  ))}
                </List>
              </Paper>
            )}
          </Grid>
        </Grid>
      </Container>
    </div>
  );
}

export default App;
