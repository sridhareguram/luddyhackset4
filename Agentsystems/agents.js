const { v4: uuidv4 } = require('uuid');

// Sample course catalog
const COURSE_CATALOG = {
  'AI Basics': { prerequisites: [], credits: 3 },
  'Machine Learning 101': { prerequisites: ['AI Basics'], credits: 4 },
  'Deep Learning': { prerequisites: ['Machine Learning 101'], credits: 4 },
  'Robotics Fundamentals': { prerequisites: ['AI Basics'], credits: 3 },
  'Data Structures': { prerequisites: [], credits: 3 }
};

// Sample event database
const EVENTS_DB = [
  { id: 'e1', title: 'Intro to Robotics Workshop', date: '2023-06-15', tags: ['robotics', 'workshop'] },
  { id: 'e2', title: 'AI Hackathon', date: '2023-06-20', tags: ['ai', 'hackathon'] },
  { id: 'e3', title: 'Wellness Seminar', date: '2023-06-10', tags: ['wellness'] }
];

// Student state
let students = {};

// Agent status tracking
let agentStatuses = {
  ProfessorAgent: 'idle',
  RegistrarAgent: 'idle',
  CounselorAgent: 'idle',
  EventAgent: 'idle',
  MentorAgent: 'idle'
};

let broadcastFunction = null;

// Initialize all agents
function initialize(broadcast) {
  broadcastFunction = broadcast;
  
  // Initialize with a default student for demo purposes
  const studentId = uuidv4();
  students[studentId] = {
    id: studentId,
    name: 'Demo Student',
    courses: [],
    completedCourses: [],
    interests: ['ai', 'robotics'],
    stressLevel: 0,
    learningScores: {},
    lastActivity: new Date()
  };
  
  // Start mentor agent monitoring
  setInterval(() => MentorAgent.monitorActivity(), 60000);
}

// Handle student actions
function handleStudentAction(action, data) {
  const studentId = Object.keys(students)[0]; // For demo, using the first student
  
  switch (action) {
    case 'request-course':
      RegistrarAgent.handleCourseRequest(studentId, data.course);
      break;
    case 'answer-quiz':
      ProfessorAgent.handleQuizAnswer(studentId, data.questionId, data.answer);
      break;
    case 'request-lesson':
      ProfessorAgent.provideLesson(studentId, data.topic);
      break;
    case 'report-stress':
      CounselorAgent.handleStressReport(studentId, data.level, data.message);
      break;
    case 'request-events':
      EventAgent.provideEventRecommendations(studentId);
      break;
    default:
      console.log(`Unknown action: ${action}`);
  }
}

// Get current agent statuses
function getAgentStatuses() {
  return agentStatuses;
}

// Professor Agent
const ProfessorAgent = {
  lessons: {
    'AI Basics': [
      { type: 'text', content: 'AI stands for Artificial Intelligence.' },
      { type: 'text', content: 'It involves creating intelligent machines that work like humans.' },
      { type: 'quiz', 
        question: 'AI stands for Artificial Intelligence.', 
        options: ['True', 'False'], 
        correctAnswer: 'True',
        id: 'q1'
      }
    ],
    'Machine Learning 101': [
      { type: 'text', content: 'Machine Learning is a subset of AI.' },
      { type: 'text', content: 'It focuses on algorithms that learn from data.' }
    ]
  },
  
  provideLesson(studentId, topic) {
    agentStatuses.ProfessorAgent = 'teaching';
    broadcastFunction({ type: 'agent-status', data: agentStatuses });
    
    const student = students[studentId];
    if (!this.lessons[topic]) {
      broadcastFunction({
        type: 'agent-message',
        agent: 'ProfessorAgent',
        message: `I don't have lessons on ${topic} yet. Maybe try another topic?`
      });
      return;
    }
    
    // Send lesson content
    this.lessons[topic].forEach(item => {
      if (item.type === 'text') {
        broadcastFunction({
          type: 'lesson-content',
          agent: 'ProfessorAgent',
          content: item.content,
          studentId
        });
      } else if (item.type === 'quiz') {
        broadcastFunction({
          type: 'quiz-question',
          agent: 'ProfessorAgent',
          question: item.question,
          options: item.options,
          questionId: item.id,
          studentId
        });
      }
    });
    
    setTimeout(() => {
      agentStatuses.ProfessorAgent = 'idle';
      broadcastFunction({ type: 'agent-status', data: agentStatuses });
    }, 3000);
  },
  
  handleQuizAnswer(studentId, questionId, answer) {
    agentStatuses.ProfessorAgent = 'evaluating';
    broadcastFunction({ type: 'agent-status', data: agentStatuses });
    
    // Find the question in lessons
    let isCorrect = false;
    let questionText = '';
    
    Object.values(this.lessons).forEach(lesson => {
      const question = lesson.find(item => item.type === 'quiz' && item.id === questionId);
      if (question) {
        isCorrect = answer === question.correctAnswer;
        questionText = question.question;
      }
    });
    
    // Update student learning score
    const student = students[studentId];
    const topic = this.getTopicForQuestion(questionId);
    if (!student.learningScores[topic]) {
      student.learningScores[topic] = { correct: 0, total: 0 };
    }
    
    student.learningScores[topic].total += 1;
    if (isCorrect) {
      student.learningScores[topic].correct += 1;
    }
    
    // Send feedback
    broadcastFunction({
      type: 'quiz-feedback',
      agent: 'ProfessorAgent',
      question: questionText,
      isCorrect,
      score: student.learningScores[topic],
      studentId
    });
    
    // Notify CounselorAgent about progress
    CounselorAgent.updateLearningProgress(studentId, topic, 
      student.learningScores[topic].correct / student.learningScores[topic].total);
    
    setTimeout(() => {
      agentStatuses.ProfessorAgent = 'idle';
      broadcastFunction({ type: 'agent-status', data: agentStatuses });
    }, 2000);
  },
  
  getTopicForQuestion(questionId) {
    for (const [topic, lesson] of Object.entries(this.lessons)) {
      const question = lesson.find(item => item.type === 'quiz' && item.id === questionId);
      if (question) return topic;
    }
    return null;
  }
};

// Registrar Agent
const RegistrarAgent = {
  handleCourseRequest(studentId, courseName) {
    agentStatuses.RegistrarAgent = 'processing';
    broadcastFunction({ type: 'agent-status', data: agentStatuses });
    
    const student = students[studentId];
    const course = COURSE_CATALOG[courseName];
    
    if (!course) {
      broadcastFunction({
        type: 'agent-message',
        agent: 'RegistrarAgent',
        message: `Course "${courseName}" not found in our catalog.`,
        studentId
      });
      return;
    }
    
    // Check prerequisites
    const missingPrereqs = course.prerequisites.filter(prereq => 
      !student.completedCourses.includes(prereq));
    
    if (missingPrereqs.length > 0) {
      broadcastFunction({
        type: 'agent-message',
        agent: 'RegistrarAgent',
        message: `Cannot register for ${courseName}. Missing prerequisites: ${missingPrereqs.join(', ')}.`,
        studentId
      });
    } else if (student.courses.includes(courseName)) {
      broadcastFunction({
        type: 'agent-message',
        agent: 'RegistrarAgent',
        message: `You are already registered for ${courseName}.`,
        studentId
      });
    } else {
      // Check with Counselor about workload
      const workloadStatus = CounselorAgent.checkWorkload(studentId, course.credits);
      
      if (workloadStatus.allowed) {
        student.courses.push(courseName);
        broadcastFunction({
          type: 'agent-message',
          agent: 'RegistrarAgent',
          message: `Successfully registered for ${courseName}!`,
          studentId
        });
        
        // Notify ProfessorAgent to start teaching if it's the first course
        if (student.courses.length === 1) {
          ProfessorAgent.provideLesson(studentId, courseName);
        }
        
        // Update dashboard with new course list
        broadcastFunction({
          type: 'student-update',
          field: 'courses',
          value: student.courses,
          studentId
        });
      } else {
        broadcastFunction({
          type: 'agent-message',
          agent: 'RegistrarAgent',
          message: `Registration denied for ${courseName}. ${workloadStatus.message}`,
          studentId
        });
      }
    }
    
    setTimeout(() => {
      agentStatuses.RegistrarAgent = 'idle';
      broadcastFunction({ type: 'agent-status', data: agentStatuses });
    }, 2000);
  },
  
  completeCourse(studentId, courseName) {
    const student = students[studentId];
    const courseIndex = student.courses.indexOf(courseName);
    
    if (courseIndex >= 0) {
      student.courses.splice(courseIndex, 1);
      student.completedCourses.push(courseName);
      
      broadcastFunction({
        type: 'agent-message',
        agent: 'RegistrarAgent',
        message: `Congratulations! You've completed ${courseName}.`,
        studentId
      });
      
      // Update dashboard
      broadcastFunction({
        type: 'student-update',
        field: 'courses',
        value: student.courses,
        studentId
      });
      
      broadcastFunction({
        type: 'student-update',
        field: 'completedCourses',
        value: student.completedCourses,
        studentId
      });
      
      // Notify CounselorAgent
      CounselorAgent.updateWorkload(studentId, -COURSE_CATALOG[courseName].credits);
    }
  }
};

// Counselor Agent
const CounselorAgent = {
  checkWorkload(studentId, additionalCredits = 0) {
    const student = students[studentId];
    const currentCredits = student.courses.reduce((sum, course) => 
      sum + (COURSE_CATALOG[course]?.credits || 0), 0);
    const totalCredits = currentCredits + additionalCredits;
    
    if (totalCredits > 12) {
      return { allowed: false, message: 'Maximum credit limit (12) exceeded.' };
    } else if (totalCredits > 9 && student.stressLevel > 70) {
      return { allowed: false, message: 'High stress level detected. Consider a lighter workload.' };
    } else {
      return { allowed: true, message: 'Workload acceptable.' };
    }
  },
  
  updateWorkload(studentId, creditChange) {
    const student = students[studentId];
    // Update stress level based on workload
    const currentCredits = student.courses.reduce((sum, course) => 
      sum + (COURSE_CATALOG[course]?.credits || 0), 0);
    
    const newStress = Math.min(100, Math.max(0, 
      student.stressLevel + (creditChange > 0 ? creditChange * 5 : creditChange * 2)));
    
    student.stressLevel = newStress;
    
    broadcastFunction({
      type: 'student-update',
      field: 'stressLevel',
      value: newStress,
      studentId
    });
    
    if (newStress > 70) {
      this.sendWellnessAdvice(studentId);
    }
  },
  
  handleStressReport(studentId, level, message) {
    agentStatuses.CounselorAgent = 'counseling';
    broadcastFunction({ type: 'agent-status', data: agentStatuses });
    
    const student = students[studentId];
    student.stressLevel = level;
    
    broadcastFunction({
      type: 'student-update',
      field: 'stressLevel',
      value: level,
      studentId
    });
    
    this.sendWellnessAdvice(studentId, message);
    
    setTimeout(() => {
      agentStatuses.CounselorAgent = 'idle';
      broadcastFunction({ type: 'agent-status', data: agentStatuses });
    }, 3000);
  },
  
  sendWellnessAdvice(studentId, message = '') {
    const student = students[studentId];
    let advice = '';
    
    if (student.stressLevel > 80) {
      advice = 'You seem very stressed. I strongly recommend reducing your course load and taking time for self-care.';
    } else if (student.stressLevel > 60) {
      advice = 'You appear somewhat stressed. Consider taking breaks between study sessions.';
    } else {
      advice = 'Your stress levels seem manageable. Keep up the good work!';
    }
    
    if (message) {
      advice += ` You mentioned: "${message}". I hear you.`;
    }
    
    broadcastFunction({
      type: 'agent-message',
      agent: 'CounselorAgent',
      message: advice,
      studentId
    });
    
    // Suggest specific actions if stress is high
    if (student.stressLevel > 70) {
      const overloadedCourses = student.courses.length > 3 ? 
        `You're taking ${student.courses.length} courses.` : '';
      
      broadcastFunction({
        type: 'agent-message',
        agent: 'CounselorAgent',
        message: `${overloadedCourses} Would you like me to help you drop a course or find wellness events?`,
        studentId
      });
    }
  },
  
  updateLearningProgress(studentId, topic, mastery) {
    if (mastery > 0.8) {
      const student = students[studentId];
      const nextCourse = this.getNextCourse(topic);
      
      if (nextCourse && !student.completedCourses.includes(nextCourse) && 
          !student.courses.includes(nextCourse)) {
        broadcastFunction({
          type: 'agent-message',
          agent: 'CounselorAgent',
          message: `Great progress in ${topic}! Would you like to register for ${nextCourse} next?`,
          studentId
        });
      }
    }
  },
  
  getNextCourse(currentCourse) {
    // Simple logic to find the next course in sequence
    if (currentCourse === 'AI Basics') return 'Machine Learning 101';
    if (currentCourse === 'Machine Learning 101') return 'Deep Learning';
    return null;
  }
};

// Event Agent
const EventAgent = {
  provideEventRecommendations(studentId) {
    agentStatuses.EventAgent = 'searching';
    broadcastFunction({ type: 'agent-status', data: agentStatuses });
    
    const student = students[studentId];
    const recommendedEvents = this.filterEvents(student);
    
    if (recommendedEvents.length === 0) {
      broadcastFunction({
        type: 'agent-message',
        agent: 'EventAgent',
        message: 'No events match your current interests and schedule.',
        studentId
      });
    } else {
      broadcastFunction({
        type: 'event-recommendations',
        agent: 'EventAgent',
        events: recommendedEvents,
        studentId
      });
    }
    
    setTimeout(() => {
      agentStatuses.EventAgent = 'idle';
      broadcastFunction({ type: 'agent-status', data: agentStatuses });
    }, 2000);
  },
  
  filterEvents(student) {
    // Filter events based on student interests and courses
    return EVENTS_DB.filter(event => {
      // Match interests
      const interestMatch = student.interests.some(interest => 
        event.tags.some(tag => tag.includes(interest)));
      
      // Match courses
      const courseMatch = student.courses.some(course => 
        event.tags.some(tag => course.toLowerCase().includes(tag)));
      
      return interestMatch || courseMatch;
    }).slice(0, 3); // Return top 3 matches
  }
};

// Mentor Agent
const MentorAgent = {
  monitorActivity() {
    const now = new Date();
    const studentId = Object.keys(students)[0]; // Demo - first student
    const student = students[studentId];
    
    const hoursSinceLastActivity = (now - new Date(student.lastActivity)) / (1000 * 60 * 60);
    
    if (hoursSinceLastActivity > 4) {
      this.sendNudge(studentId, `You haven't been active for ${Math.floor(hoursSinceLastActivity)} hours. Time to study!`);
    }
    
    // Check for daily goals
    const today = now.toDateString();
    if (!student.lastGoalDate || student.lastGoalDate !== today) {
      this.setDailyGoals(studentId);
      student.lastGoalDate = today;
    }
  },
  
  sendNudge(studentId, message) {
    agentStatuses.MentorAgent = 'nudging';
    broadcastFunction({ type: 'agent-status', data: agentStatuses });
    
    broadcastFunction({
      type: 'agent-message',
      agent: 'MentorAgent',
      message,
      studentId
    });
    
    setTimeout(() => {
      agentStatuses.MentorAgent = 'idle';
      broadcastFunction({ type: 'agent-status', data: agentStatuses });
    }, 1000);
  },
  
  setDailyGoals(studentId) {
    const student = students[studentId];
    const goals = [];
    
    if (student.courses.length > 0) {
      goals.push(`Complete 1 quiz in ${student.courses[0]}`);
    }
    
    if (student.stressLevel > 50) {
      goals.push('Take a 15-minute break for mindfulness');
    }
    
    if (goals.length > 0) {
      this.sendNudge(studentId, `Today's goals:\n- ${goals.join('\n- ')}`);
    }
  }
};

module.exports = {
  initialize,
  handleStudentAction,
  getAgentStatuses
};
