import React, { useState, useEffect, useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { 
  Cookie, 
  ArrowLeft, 
  Calendar, 
  Settings, 
  Eye, 
  Target, 
  Shield,
  ChevronUp,
  FileText,
  Clock,
  BarChart3,
  Globe,
  Mail,
  MessageSquare,
  Home,
  ToggleLeft,
  ToggleRight,
  Info,
  HelpCircle
} from 'lucide-react';

const Cookies = () => {
  const navigate = useNavigate();
  const [showScrollTop, setShowScrollTop] = useState(false);
  const [activeSection, setActiveSection] = useState('');
  const [readProgress, setReadProgress] = useState(0);
  
  // Cookie preferences state
  const [cookiePreferences, setCookiePreferences] = useState({
    necessary: true,
    functional: true,
    analytics: false,
    marketing: false,
  });

  const sections = useMemo(() => [
    { id: 'what-are-cookies', title: 'What Are Cookies?', icon: Cookie },
    { id: 'types', title: 'Types of Cookies', icon: Target },
    { id: 'necessary', title: 'Necessary Cookies', icon: Shield },
    { id: 'functional', title: 'Functional Cookies', icon: Settings },
    { id: 'analytics', title: 'Analytics Cookies', icon: BarChart3 },
    { id: 'marketing', title: 'Marketing Cookies', icon: Globe },
    { id: 'manage', title: 'Manage Preferences', icon: ToggleRight },
    { id: 'third-party', title: 'Third-Party Cookies', icon: Eye },
    { id: 'changes', title: 'Policy Updates', icon: Info },
    { id: 'contact', title: 'Contact Us', icon: Mail },
  ], []);

  useEffect(() => {
    const handleScroll = () => {
      setShowScrollTop(window.scrollY > 300);
      
      const scrollHeight = document.documentElement.scrollHeight - window.innerHeight;
      const progress = (window.scrollY / scrollHeight) * 100;
      setReadProgress(Math.min(progress, 100));

      const sectionElements = sections.map(s => document.getElementById(s.id));
      const currentSection = sectionElements.find((el) => {
        if (!el) return false;
        const rect = el.getBoundingClientRect();
        return rect.top <= 150 && rect.bottom > 150;
      });
      if (currentSection) {
        setActiveSection(currentSection.id);
      }
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, [sections]);

  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const scrollToSection = (sectionId) => {
    const element = document.getElementById(sectionId);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  const togglePreference = (type) => {
    if (type === 'necessary') return; // Can't disable necessary cookies
    setCookiePreferences(prev => ({
      ...prev,
      [type]: !prev[type]
    }));
  };

  const savePreferences = () => {
    // Save preferences to localStorage or send to server
    localStorage.setItem('cookiePreferences', JSON.stringify(cookiePreferences));
    alert('Cookie preferences saved successfully!');
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white dark:from-gray-900 dark:to-gray-800 transition-colors duration-300">
      {/* Progress Bar */}
      <div className="fixed top-0 left-0 w-full h-1 bg-gray-200 dark:bg-gray-700 z-50">
        <div 
          className="h-full bg-gradient-to-r from-amber-500 to-orange-600 transition-all duration-150"
          style={{ width: `${readProgress}%` }}
        />
      </div>

      {/* Header */}
      <div className="bg-gradient-to-r from-amber-500 via-orange-500 to-red-500 text-white">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <button 
              onClick={() => navigate(-1)}
              className="inline-flex items-center gap-2 text-white/90 hover:text-white transition-colors"
            >
              <ArrowLeft className="w-5 h-5" />
              <span className="font-medium">Back</span>
            </button>
            <div className="flex items-center gap-4">
              <Link to="/" className="text-white/90 hover:text-white transition-colors">
                <Home className="w-5 h-5" />
              </Link>
            </div>
          </div>
        </div>

        {/* Hero Section */}
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-16 text-center">
          <div className="inline-flex items-center justify-center w-20 h-20 bg-white/10 backdrop-blur-sm rounded-2xl mb-6">
            <Cookie className="w-10 h-10 text-white" />
          </div>
          <h1 className="text-4xl md:text-5xl font-bold mb-4">
            Cookie Policy
          </h1>
          <p className="text-xl text-amber-100 mb-6 max-w-2xl mx-auto">
            Learn how we use cookies and similar technologies to enhance your experience.
          </p>
          <div className="flex items-center justify-center gap-6 text-sm text-amber-200">
            <div className="flex items-center gap-2">
              <Calendar className="w-4 h-4" />
              <span>Effective: January 1, 2026</span>
            </div>
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4" />
              <span>8 min read</span>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="flex flex-col lg:flex-row gap-8">
          
          {/* Table of Contents - Sticky Sidebar */}
          <aside className="lg:w-72 shrink-0">
            <div className="lg:sticky lg:top-8">
              <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg border border-gray-200 dark:border-gray-700 p-6">
                <h3 className="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-4">
                  Table of Contents
                </h3>
                <nav className="space-y-1">
                  {sections.map((section) => {
                    const Icon = section.icon;
                    return (
                      <button
                        key={section.id}
                        onClick={() => scrollToSection(section.id)}
                        className={`w-full flex items-center gap-3 px-3 py-2 text-sm rounded-lg transition-all duration-200 text-left ${
                          activeSection === section.id
                            ? 'bg-amber-50 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400 font-medium'
                            : 'text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700'
                        }`}
                      >
                        <Icon className="w-4 h-4 shrink-0" />
                        <span className="truncate">{section.title}</span>
                      </button>
                    );
                  })}
                </nav>

                {/* Quick Links */}
                <div className="mt-6 pt-6 border-t border-gray-200 dark:border-gray-700">
                  <h4 className="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-3">
                    Related Policies
                  </h4>
                  <div className="space-y-2">
                    <Link
                      to="/privacy"
                      className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400 hover:text-amber-600 dark:hover:text-amber-400 transition-colors"
                    >
                      <Shield className="w-4 h-4" />
                      Privacy Policy
                    </Link>
                    <Link
                      to="/terms"
                      className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400 hover:text-amber-600 dark:hover:text-amber-400 transition-colors"
                    >
                      <FileText className="w-4 h-4" />
                      Terms of Service
                    </Link>
                  </div>
                </div>
              </div>
            </div>
          </aside>

          {/* Content */}
          <main className="flex-1 min-w-0">
            <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
              <div className="p-8 md:p-10 space-y-12">
                
                {/* What Are Cookies */}
                <section id="what-are-cookies">
                  <div className="flex items-center gap-3 mb-4">
                    <span className="flex items-center justify-center w-8 h-8 bg-amber-100 dark:bg-amber-900/30 rounded-lg text-amber-600 dark:text-amber-400 text-sm font-bold">1</span>
                    <h2 className="text-2xl font-bold text-gray-900 dark:text-white">What Are Cookies?</h2>
                  </div>
                  <p className="text-gray-700 dark:text-gray-300 leading-relaxed mb-4">
                    Cookies are small text files that are placed on your device when you visit a website. They are 
                    widely used to make websites work more efficiently and to provide information to website owners.
                  </p>
                  <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-700 rounded-xl p-6">
                    <div className="flex items-start gap-3">
                      <HelpCircle className="w-6 h-6 text-amber-600 dark:text-amber-400 shrink-0 mt-1" />
                      <p className="text-amber-800 dark:text-amber-200">
                        ProComm uses cookies and similar tracking technologies to enhance your experience, provide 
                        essential functionality, and analyze how our Services are used.
                      </p>
                    </div>
                  </div>
                </section>

                {/* Types of Cookies */}
                <section id="types">
                  <div className="flex items-center gap-3 mb-4">
                    <span className="flex items-center justify-center w-8 h-8 bg-amber-100 dark:bg-amber-900/30 rounded-lg text-amber-600 dark:text-amber-400 text-sm font-bold">2</span>
                    <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Types of Cookies We Use</h2>
                  </div>
                  
                  <p className="text-gray-700 dark:text-gray-300 mb-6">
                    We use different types of cookies for various purposes:
                  </p>
                  
                  <div className="grid sm:grid-cols-2 gap-4">
                    {[
                      { icon: Shield, title: 'Strictly Necessary', desc: 'Essential for the site to function', color: 'blue' },
                      { icon: Settings, title: 'Functional', desc: 'Remember your preferences', color: 'purple' },
                      { icon: BarChart3, title: 'Analytics', desc: 'Help us improve our services', color: 'green' },
                      { icon: Globe, title: 'Marketing', desc: 'Used for personalized ads', color: 'orange' },
                    ].map((item, index) => (
                      <div key={index} className={`border-l-4 border-${item.color}-500 bg-gray-50 dark:bg-gray-700/50 rounded-r-xl p-4`}>
                        <div className="flex items-center gap-3 mb-2">
                          <item.icon className={`w-5 h-5 text-${item.color}-600 dark:text-${item.color}-400`} />
                          <h4 className="font-semibold text-gray-900 dark:text-white">{item.title}</h4>
                        </div>
                        <p className="text-sm text-gray-600 dark:text-gray-400">{item.desc}</p>
                      </div>
                    ))}
                  </div>
                </section>

                {/* Necessary Cookies */}
                <section id="necessary">
                  <div className="flex items-center gap-3 mb-4">
                    <span className="flex items-center justify-center w-8 h-8 bg-amber-100 dark:bg-amber-900/30 rounded-lg text-amber-600 dark:text-amber-400 text-sm font-bold">3</span>
                    <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Strictly Necessary Cookies</h2>
                  </div>
                  
                  <div className="border-l-4 border-blue-500 bg-blue-50 dark:bg-blue-900/20 rounded-r-xl p-6 mb-6">
                    <p className="text-blue-800 dark:text-blue-200 mb-4">
                      These cookies are essential for the operation of ProComm. They enable core functionality such as 
                      authentication, security, and session management. <strong>These cookies cannot be disabled.</strong>
                    </p>
                    
                    <div className="space-y-3 mt-4">
                      <h4 className="font-semibold text-blue-900 dark:text-blue-100">Examples:</h4>
                      <ul className="space-y-2">
                        {[
                          { name: 'Authentication', desc: 'Keeping you logged in to your account' },
                          { name: 'Security', desc: 'Protecting against cross-site request forgery attacks' },
                          { name: 'Session Management', desc: 'Maintaining your preferences during a session' },
                          { name: 'Load Balancing', desc: 'Distributing traffic across our servers' },
                        ].map((item, index) => (
                          <li key={index} className="flex items-start gap-3 text-blue-800 dark:text-blue-200">
                            <span className="w-2 h-2 bg-blue-500 rounded-full mt-2 shrink-0"></span>
                            <span><strong>{item.name}:</strong> {item.desc}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                </section>

                {/* Functional Cookies */}
                <section id="functional">
                  <div className="flex items-center gap-3 mb-4">
                    <span className="flex items-center justify-center w-8 h-8 bg-amber-100 dark:bg-amber-900/30 rounded-lg text-amber-600 dark:text-amber-400 text-sm font-bold">4</span>
                    <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Functional Cookies</h2>
                  </div>
                  
                  <div className="border-l-4 border-purple-500 bg-purple-50 dark:bg-purple-900/20 rounded-r-xl p-6">
                    <p className="text-purple-800 dark:text-purple-200 mb-4">
                      These cookies enable enhanced functionality and personalization. They remember your choices 
                      and provide improved features.
                    </p>
                    
                    <div className="space-y-3 mt-4">
                      <h4 className="font-semibold text-purple-900 dark:text-purple-100">Examples:</h4>
                      <ul className="space-y-2">
                        {[
                          { name: 'Theme Preference', desc: 'Remembering your dark/light mode selection' },
                          { name: 'Language', desc: 'Storing your preferred language' },
                          { name: 'Video Settings', desc: 'Remembering your camera and microphone preferences' },
                          { name: 'Layout Preferences', desc: 'Customizing your meeting view layout' },
                        ].map((item, index) => (
                          <li key={index} className="flex items-start gap-3 text-purple-800 dark:text-purple-200">
                            <span className="w-2 h-2 bg-purple-500 rounded-full mt-2 shrink-0"></span>
                            <span><strong>{item.name}:</strong> {item.desc}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                </section>

                {/* Analytics Cookies */}
                <section id="analytics">
                  <div className="flex items-center gap-3 mb-4">
                    <span className="flex items-center justify-center w-8 h-8 bg-amber-100 dark:bg-amber-900/30 rounded-lg text-amber-600 dark:text-amber-400 text-sm font-bold">5</span>
                    <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Analytics Cookies</h2>
                  </div>
                  
                  <div className="border-l-4 border-green-500 bg-green-50 dark:bg-green-900/20 rounded-r-xl p-6">
                    <p className="text-green-800 dark:text-green-200 mb-4">
                      These cookies help us understand how visitors interact with ProComm by collecting and reporting 
                      information anonymously. This helps us improve our services.
                    </p>
                    
                    <div className="space-y-3 mt-4">
                      <h4 className="font-semibold text-green-900 dark:text-green-100">Data Collected:</h4>
                      <ul className="space-y-2">
                        {[
                          'Pages visited and time spent',
                          'Features used and interaction patterns',
                          'Error reports and performance metrics',
                          'Device and browser information',
                        ].map((item, index) => (
                          <li key={index} className="flex items-start gap-3 text-green-800 dark:text-green-200">
                            <span className="w-2 h-2 bg-green-500 rounded-full mt-2 shrink-0"></span>
                            <span>{item}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                </section>

                {/* Marketing Cookies */}
                <section id="marketing">
                  <div className="flex items-center gap-3 mb-4">
                    <span className="flex items-center justify-center w-8 h-8 bg-amber-100 dark:bg-amber-900/30 rounded-lg text-amber-600 dark:text-amber-400 text-sm font-bold">6</span>
                    <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Marketing Cookies</h2>
                  </div>
                  
                  <div className="border-l-4 border-orange-500 bg-orange-50 dark:bg-orange-900/20 rounded-r-xl p-6">
                    <p className="text-orange-800 dark:text-orange-200 mb-4">
                      These cookies may be set through our site by our advertising partners. They may be used to 
                      build a profile of your interests and show you relevant advertisements on other sites.
                    </p>
                    
                    <div className="bg-orange-100 dark:bg-orange-900/30 rounded-lg p-4 mt-4">
                      <p className="text-sm text-orange-800 dark:text-orange-200">
                        <strong>Note:</strong> ProComm currently uses minimal marketing cookies. You can opt out of 
                        these cookies at any time through our cookie preferences panel.
                      </p>
                    </div>
                  </div>
                </section>

                {/* Manage Preferences */}
                <section id="manage">
                  <div className="flex items-center gap-3 mb-4">
                    <span className="flex items-center justify-center w-8 h-8 bg-amber-100 dark:bg-amber-900/30 rounded-lg text-amber-600 dark:text-amber-400 text-sm font-bold">7</span>
                    <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Manage Your Preferences</h2>
                  </div>
                  
                  <p className="text-gray-700 dark:text-gray-300 mb-6">
                    You can customize your cookie preferences below. Note that disabling certain cookies may affect 
                    your experience on our platform.
                  </p>
                  
                  <div className="bg-gray-50 dark:bg-gray-700/50 rounded-xl p-6 space-y-4">
                    {[
                      { key: 'necessary', title: 'Strictly Necessary', desc: 'Required for the site to function', locked: true, color: 'blue' },
                      { key: 'functional', title: 'Functional', desc: 'Remember your preferences and settings', locked: false, color: 'purple' },
                      { key: 'analytics', title: 'Analytics', desc: 'Help us improve our services', locked: false, color: 'green' },
                      { key: 'marketing', title: 'Marketing', desc: 'Personalized advertisements', locked: false, color: 'orange' },
                    ].map((item) => (
                      <div key={item.key} className="flex items-center justify-between p-4 bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-600">
                        <div className="flex items-center gap-4">
                          <div className={`w-10 h-10 bg-${item.color}-100 dark:bg-${item.color}-900/30 rounded-lg flex items-center justify-center`}>
                            {item.key === 'necessary' && <Shield className={`w-5 h-5 text-${item.color}-600 dark:text-${item.color}-400`} />}
                            {item.key === 'functional' && <Settings className={`w-5 h-5 text-${item.color}-600 dark:text-${item.color}-400`} />}
                            {item.key === 'analytics' && <BarChart3 className={`w-5 h-5 text-${item.color}-600 dark:text-${item.color}-400`} />}
                            {item.key === 'marketing' && <Globe className={`w-5 h-5 text-${item.color}-600 dark:text-${item.color}-400`} />}
                          </div>
                          <div>
                            <h4 className="font-semibold text-gray-900 dark:text-white">{item.title}</h4>
                            <p className="text-sm text-gray-500 dark:text-gray-400">{item.desc}</p>
                          </div>
                        </div>
                        <button
                          onClick={() => togglePreference(item.key)}
                          disabled={item.locked}
                          className={`p-2 rounded-lg transition-colors ${item.locked ? 'cursor-not-allowed opacity-50' : 'cursor-pointer'}`}
                        >
                          {cookiePreferences[item.key] ? (
                            <ToggleRight className="w-8 h-8 text-green-500" />
                          ) : (
                            <ToggleLeft className="w-8 h-8 text-gray-400" />
                          )}
                        </button>
                      </div>
                    ))}
                    
                    <button
                      onClick={savePreferences}
                      className="w-full mt-4 py-3 px-6 bg-amber-500 hover:bg-amber-600 text-white font-semibold rounded-xl transition-colors"
                    >
                      Save Preferences
                    </button>
                  </div>
                </section>

                {/* Third-Party Cookies */}
                <section id="third-party">
                  <div className="flex items-center gap-3 mb-4">
                    <span className="flex items-center justify-center w-8 h-8 bg-amber-100 dark:bg-amber-900/30 rounded-lg text-amber-600 dark:text-amber-400 text-sm font-bold">8</span>
                    <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Third-Party Cookies</h2>
                  </div>
                  
                  <p className="text-gray-700 dark:text-gray-300 mb-6">
                    Some cookies are placed by third-party services that appear on our pages:
                  </p>
                  
                  <div className="grid sm:grid-cols-2 gap-4">
                    {[
                      { name: 'Google Analytics', purpose: 'Website analytics and performance monitoring' },
                      { name: 'Firebase', purpose: 'Authentication and database services' },
                      { name: 'Cloudinary', purpose: 'Image storage and optimization' },
                      { name: 'PeerJS/WebRTC', purpose: 'Video conferencing functionality' },
                    ].map((item, index) => (
                      <div key={index} className="p-4 border border-gray-200 dark:border-gray-600 rounded-xl">
                        <h4 className="font-semibold text-gray-900 dark:text-white mb-1">{item.name}</h4>
                        <p className="text-sm text-gray-600 dark:text-gray-400">{item.purpose}</p>
                      </div>
                    ))}
                  </div>
                </section>

                {/* Policy Updates */}
                <section id="changes">
                  <div className="flex items-center gap-3 mb-4">
                    <span className="flex items-center justify-center w-8 h-8 bg-amber-100 dark:bg-amber-900/30 rounded-lg text-amber-600 dark:text-amber-400 text-sm font-bold">9</span>
                    <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Policy Updates</h2>
                  </div>
                  
                  <p className="text-gray-700 dark:text-gray-300">
                    We may update this Cookie Policy from time to time to reflect changes in our practices or for 
                    legal, regulatory, or operational reasons. We will notify you of any material changes by posting 
                    the new policy on this page and updating the effective date.
                  </p>
                </section>

                {/* Contact */}
                <section id="contact">
                  <div className="flex items-center gap-3 mb-4">
                    <span className="flex items-center justify-center w-8 h-8 bg-amber-100 dark:bg-amber-900/30 rounded-lg text-amber-600 dark:text-amber-400 text-sm font-bold">10</span>
                    <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Contact Us</h2>
                  </div>
                  
                  <p className="text-gray-700 dark:text-gray-300 mb-6">
                    If you have any questions about our use of cookies, please contact us:
                  </p>
                  
                  <div className="bg-gradient-to-br from-amber-50 to-orange-50 dark:from-amber-900/20 dark:to-orange-900/20 rounded-xl p-6">
                    <div className="flex flex-col sm:flex-row gap-6">
                      <div className="flex items-center gap-3">
                        <div className="p-2 bg-amber-100 dark:bg-amber-900/30 rounded-lg">
                          <Mail className="w-5 h-5 text-amber-600 dark:text-amber-400" />
                        </div>
                        <div>
                          <p className="text-sm text-gray-500 dark:text-gray-400">Email</p>
                          <a href="mailto:privacy@procomm.com" className="text-amber-600 dark:text-amber-400 font-medium hover:underline">
                            privacy@procomm.com
                          </a>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <div className="p-2 bg-orange-100 dark:bg-orange-900/30 rounded-lg">
                          <MessageSquare className="w-5 h-5 text-orange-600 dark:text-orange-400" />
                        </div>
                        <div>
                          <p className="text-sm text-gray-500 dark:text-gray-400">Support</p>
                          <Link to="/support" className="text-orange-600 dark:text-orange-400 font-medium hover:underline">
                            Visit Help Center
                          </Link>
                        </div>
                      </div>
                    </div>
                  </div>
                </section>
              </div>
            </div>

            {/* Footer Navigation */}
            <div className="mt-8 flex flex-col sm:flex-row items-center justify-between gap-4 p-6 bg-white dark:bg-gray-800 rounded-2xl shadow-lg border border-gray-200 dark:border-gray-700">
              <div className="flex items-center gap-4 text-sm">
                <Link to="/privacy" className="text-gray-600 dark:text-gray-400 hover:text-amber-600 dark:hover:text-amber-400 transition-colors">
                  Privacy Policy
                </Link>
                <span className="text-gray-300 dark:text-gray-600">•</span>
                <Link to="/terms" className="text-gray-600 dark:text-gray-400 hover:text-amber-600 dark:hover:text-amber-400 transition-colors">
                  Terms of Service
                </Link>
              </div>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                © 2026 ProComm. All rights reserved.
              </p>
            </div>
          </main>
        </div>
      </div>

      {/* Scroll to Top Button */}
      {showScrollTop && (
        <button
          onClick={scrollToTop}
          className="fixed bottom-8 right-8 p-3 bg-amber-500 hover:bg-amber-600 text-white rounded-full shadow-lg transition-all duration-300 hover:scale-110 z-40"
          aria-label="Scroll to top"
        >
          <ChevronUp className="w-6 h-6" />
        </button>
      )}
    </div>
  );
};

export default Cookies;
