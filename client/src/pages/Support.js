import React, { useState } from 'react';
import { 
  HelpCircle, 
  MessageSquare, 
  Phone, 
  Mail, 
  ExternalLink, 
  ChevronDown, 
  ChevronRight,
  Camera,
  Mic,
  Monitor,
  Settings,
  BookOpen
} from 'lucide-react';

const Support = () => {
  const [expandedFaq, setExpandedFaq] = useState(null);
  const [contactForm, setContactForm] = useState({
    name: 'Varun Kumar',
    email: 'varunkumar1329@gmail.com',
    subject: '',
    message: '',
    category: 'general'
  });

  const faqs = [
    {
      id: 1,
      question: 'How do I create a new meeting?',
      answer: 'Click on "New Meeting" from the dashboard. Add a title, description, and invite participants by email. You can start the meeting immediately or share the meeting link.'
    },
    {
      id: 2,
      question: 'Why can\'t I join a meeting?',
      answer: 'Make sure you have been invited to the meeting and are using the correct email address. Check your camera and microphone permissions in your browser settings.'
    },
    {
      id: 3,
      question: 'How do I share my screen?',
      answer: 'During a meeting, click the screen share button in the control bar. Select the screen, window, or application tab you want to share and click "Share".'
    },
    {
      id: 4,
      question: 'Can I record meetings?',
      answer: 'Meeting recording is currently in development. You can use third-party screen recording software as an alternative.'
    },
    {
      id: 5,
      question: 'How do I change between light and dark mode?',
      answer: 'Go to your Profile page and use the Theme toggle switch in the Settings section to switch between light and dark modes.'
    },
    {
      id: 6,
      question: 'What browsers are supported?',
      answer: 'ProComm works best on Chrome, Firefox, Safari, and Edge. Make sure your browser supports WebRTC for the best experience.'
    }
  ];

  const troubleshootingGuides = [
    {
      icon: <Camera className="w-6 h-6 text-blue-600" />,
      title: 'Camera Issues',
      description: 'Fix camera not working problems',
      link: '#camera-help'
    },
    {
      icon: <Mic className="w-6 h-6 text-green-600" />,
      title: 'Microphone Issues', 
      description: 'Resolve audio and microphone problems',
      link: '#microphone-help'
    },
    {
      icon: <Monitor className="w-6 h-6 text-purple-600" />,
      title: 'Screen Sharing',
      description: 'Learn how to share your screen effectively',
      link: '#screen-sharing-help'
    },
    {
      icon: <Settings className="w-6 h-6 text-orange-600" />,
      title: 'Settings & Preferences',
      description: 'Customize your ProComm experience',
      link: '#settings-help'
    }
  ];

  const handleFaqToggle = (faqId) => {
    setExpandedFaq(expandedFaq === faqId ? null : faqId);
  };

  const handleContactSubmit = (e) => {
    e.preventDefault();
    // Handle form submission here
    console.log('Contact form submitted:', contactForm);
    // Show success message
    alert('Thank you for contacting us! We\'ll get back to you soon.');
    setContactForm({
      ...contactForm,
      subject: '',
      message: ''
    });
  };

  const handleInputChange = (field, value) => {
    setContactForm({
      ...contactForm,
      [field]: value
    });
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 transition-colors duration-300">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-12 xl:px-16 py-8">
        
        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-4">Help & Support</h1>
          <p className="text-lg text-gray-700 dark:text-gray-400 max-w-2xl mx-auto">
            Find answers to common questions, troubleshooting guides, or get in touch with our support team.
          </p>
        </div>

        {/* Quick Help Cards */}
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
          {troubleshootingGuides.map((guide, index) => (
            <div key={index} className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6 hover:shadow-xl transition-all duration-300 cursor-pointer group border border-gray-200 dark:border-gray-700">
              <div className="flex items-center justify-between mb-4">
                <div className="p-3 bg-gray-50 dark:bg-gray-700 rounded-lg group-hover:bg-blue-50 dark:group-hover:bg-blue-900/30 transition-colors duration-300">
                  {guide.icon}
                </div>
                <ExternalLink className="w-4 h-4 text-gray-500 group-hover:text-blue-600 transition-colors duration-300" />
              </div>
              <h3 className="font-semibold text-gray-900 dark:text-white mb-2">{guide.title}</h3>
              <p className="text-sm text-gray-600 dark:text-gray-400">{guide.description}</p>
            </div>
          ))}
        </div>

        <div className="grid lg:grid-cols-2 gap-8">
          
          {/* FAQ Section */}
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6 transition-colors duration-300 border border-gray-200 dark:border-gray-700">
            <div className="flex items-center space-x-3 mb-6">
              <HelpCircle className="w-6 h-6 text-blue-600" />
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Frequently Asked Questions</h2>
            </div>
            
            <div className="space-y-4">
              {faqs.map((faq) => (
                <div key={faq.id} className="border border-gray-200 dark:border-gray-700 rounded-lg">
                  <button
                    onClick={() => handleFaqToggle(faq.id)}
                    className="w-full flex items-center justify-between p-4 text-left hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors duration-200"
                  >
                    <span className="font-medium text-gray-900 dark:text-white">{faq.question}</span>
                    {expandedFaq === faq.id ? (
                      <ChevronDown className="w-5 h-5 text-gray-500" />
                    ) : (
                      <ChevronRight className="w-5 h-5 text-gray-500" />
                    )}
                  </button>
                  {expandedFaq === faq.id && (
                    <div className="px-4 pb-4">
                      <p className="text-gray-600 dark:text-gray-400 leading-relaxed">{faq.answer}</p>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Contact Form */}
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6 transition-colors duration-300 border border-gray-200 dark:border-gray-700">
            <div className="flex items-center space-x-3 mb-6">
              <MessageSquare className="w-6 h-6 text-green-600" />
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Contact Support</h2>
            </div>
            
            <form onSubmit={handleContactSubmit} className="space-y-6">
              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <label htmlFor="name" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Name
                  </label>
                  <input
                    type="text"
                    id="name"
                    value={contactForm.name}
                    onChange={(e) => handleInputChange('name', e.target.value)}
                    className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white transition-colors duration-300"
                    required
                  />
                </div>
                
                <div>
                  <label htmlFor="email" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Email
                  </label>
                  <input
                    type="email"
                    id="email"
                    value={contactForm.email}
                    onChange={(e) => handleInputChange('email', e.target.value)}
                    className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white transition-colors duration-300"
                    required
                  />
                </div>
              </div>

              <div>
                <label htmlFor="category" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Category
                </label>
                <select
                  id="category"
                  value={contactForm.category}
                  onChange={(e) => handleInputChange('category', e.target.value)}
                  className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white transition-colors duration-300"
                >
                  <option value="general">General Question</option>
                  <option value="technical">Technical Issue</option>
                  <option value="billing">Billing Support</option>
                  <option value="feature">Feature Request</option>
                  <option value="bug">Bug Report</option>
                </select>
              </div>

              <div>
                <label htmlFor="subject" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Subject
                </label>
                <input
                  type="text"
                  id="subject"
                  value={contactForm.subject}
                  onChange={(e) => handleInputChange('subject', e.target.value)}
                  className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white transition-colors duration-300"
                  placeholder="Brief description of your issue"
                  required
                />
              </div>

              <div>
                <label htmlFor="message" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Message
                </label>
                <textarea
                  id="message"
                  value={contactForm.message}
                  onChange={(e) => handleInputChange('message', e.target.value)}
                  rows={5}
                  className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white transition-colors duration-300 resize-none"
                  placeholder="Describe your issue in detail..."
                  required
                />
              </div>

              <button
                type="submit"
                className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-3 px-4 rounded-lg transition-colors duration-200 flex items-center justify-center space-x-2"
              >
                <Mail className="w-5 h-5" />
                <span>Send Message</span>
              </button>
            </form>
          </div>
        </div>

        {/* Additional Resources */}
        <div className="mt-12 bg-gradient-to-r from-blue-600 to-purple-600 rounded-lg p-8 text-white">
          <div className="text-center">
            <BookOpen className="w-12 h-12 mx-auto mb-4 opacity-90" />
            <h3 className="text-2xl font-bold mb-2">Need More Help?</h3>
            <p className="text-blue-100 mb-6 max-w-2xl mx-auto">
              Check out our comprehensive documentation, video tutorials, and community forums for detailed guides and tips.
            </p>
            <div className="flex flex-wrap justify-center gap-4">
              <button className="bg-white/20 hover:bg-white/30 text-white px-6 py-3 rounded-lg font-medium transition-all duration-200 backdrop-blur-sm">
                <div className="flex items-center space-x-2">
                  <BookOpen className="w-5 h-5" />
                  <span>Documentation</span>
                </div>
              </button>
              <button className="bg-white/20 hover:bg-white/30 text-white px-6 py-3 rounded-lg font-medium transition-all duration-200 backdrop-blur-sm">
                <div className="flex items-center space-x-2">
                  <Phone className="w-5 h-5" />
                  <span>Schedule Call</span>
                </div>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Support;