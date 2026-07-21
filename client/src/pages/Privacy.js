import React, { useState, useEffect, useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { 
  Shield, 
  ArrowLeft, 
  Calendar, 
  Mail, 
  Lock, 
  Eye, 
  Database, 
  Globe, 
  ChevronUp, 
  FileText, 
  Cookie,
  Clock,
  Share2,
  Users,
  Server,
  Bell,
  MessageSquare,
  Home
} from 'lucide-react';

const Privacy = () => {
  const navigate = useNavigate();
  const [showScrollTop, setShowScrollTop] = useState(false);
  const [activeSection, setActiveSection] = useState('');
  const [readProgress, setReadProgress] = useState(0);

  const sections = useMemo(() => [
    { id: 'introduction', title: 'Introduction', icon: FileText },
    { id: 'information-collect', title: 'Information We Collect', icon: Database },
    { id: 'how-we-use', title: 'How We Use Information', icon: Eye },
    { id: 'information-sharing', title: 'Information Sharing', icon: Share2 },
    { id: 'data-security', title: 'Data Security', icon: Lock },
    { id: 'data-retention', title: 'Data Retention', icon: Server },
    { id: 'your-rights', title: 'Your Rights', icon: Users },
    { id: 'children-privacy', title: "Children's Privacy", icon: Shield },
    { id: 'changes', title: 'Policy Changes', icon: Bell },
    { id: 'contact', title: 'Contact Us', icon: Mail },
  ], []);

  useEffect(() => {
    const handleScroll = () => {
      setShowScrollTop(window.scrollY > 300);
      
      // Calculate read progress
      const scrollHeight = document.documentElement.scrollHeight - window.innerHeight;
      const progress = (window.scrollY / scrollHeight) * 100;
      setReadProgress(Math.min(progress, 100));

      // Track active section
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

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white dark:from-gray-900 dark:to-gray-800 transition-colors duration-300">
      {/* Progress Bar */}
      <div className="fixed top-0 left-0 w-full h-1 bg-gray-200 dark:bg-gray-700 z-50">
        <div 
          className="h-full bg-gradient-to-r from-blue-500 to-purple-600 transition-all duration-150"
          style={{ width: `${readProgress}%` }}
        />
      </div>

      {/* Header */}
      <div className="bg-gradient-to-r from-blue-600 via-blue-700 to-purple-700 text-white">
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
            <Shield className="w-10 h-10 text-white" />
          </div>
          <h1 className="text-4xl md:text-5xl font-bold mb-4">
            Privacy Policy
          </h1>
          <p className="text-xl text-blue-100 mb-6 max-w-2xl mx-auto">
            Your privacy is important to us. Learn how we collect, use, and protect your personal information.
          </p>
          <div className="flex items-center justify-center gap-6 text-sm text-blue-200">
            <div className="flex items-center gap-2">
              <Calendar className="w-4 h-4" />
              <span>Effective: January 1, 2026</span>
            </div>
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4" />
              <span>10 min read</span>
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
                            ? 'bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 font-medium'
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
                      to="/terms"
                      className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
                    >
                      <FileText className="w-4 h-4" />
                      Terms of Service
                    </Link>
                    <Link
                      to="/cookies"
                      className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
                    >
                      <Cookie className="w-4 h-4" />
                      Cookie Policy
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
                
                {/* Introduction */}
                <section id="introduction">
                  <div className="flex items-center gap-3 mb-4">
                    <span className="flex items-center justify-center w-8 h-8 bg-blue-100 dark:bg-blue-900/30 rounded-lg text-blue-600 dark:text-blue-400 text-sm font-bold">1</span>
                    <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Introduction</h2>
                  </div>
                  <div className="prose prose-gray dark:prose-invert max-w-none">
                    <p className="text-gray-700 dark:text-gray-300 leading-relaxed mb-4">
                      Welcome to ProComm. We respect your privacy and are committed to protecting your personal data. 
                      This privacy policy will inform you about how we look after your personal data when you visit our 
                      platform and tell you about your privacy rights and how the law protects you.
                    </p>
                    <p className="text-gray-700 dark:text-gray-300 leading-relaxed">
                      ProComm is a professional video conferencing platform that enables seamless communication and 
                      collaboration. This policy applies to all users of our services, including hosts, participants, 
                      and visitors to our website.
                    </p>
                  </div>
                </section>

                {/* Information We Collect */}
                <section id="information-collect">
                  <div className="flex items-center gap-3 mb-4">
                    <span className="flex items-center justify-center w-8 h-8 bg-blue-100 dark:bg-blue-900/30 rounded-lg text-blue-600 dark:text-blue-400 text-sm font-bold">2</span>
                    <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Information We Collect</h2>
                  </div>
                  
                  <div className="space-y-6">
                    <div className="bg-gray-50 dark:bg-gray-700/50 rounded-xl p-6">
                      <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-3 flex items-center gap-2">
                        <Database className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                        Information You Provide
                      </h3>
                      <ul className="space-y-3 text-gray-700 dark:text-gray-300">
                        <li className="flex items-start gap-3">
                          <span className="w-2 h-2 bg-blue-500 rounded-full mt-2 shrink-0"></span>
                          <span><strong>Account Information:</strong> Name, email address, password, and profile picture</span>
                        </li>
                        <li className="flex items-start gap-3">
                          <span className="w-2 h-2 bg-blue-500 rounded-full mt-2 shrink-0"></span>
                          <span><strong>Profile Data:</strong> Bio, preferences, and settings you choose to add</span>
                        </li>
                        <li className="flex items-start gap-3">
                          <span className="w-2 h-2 bg-blue-500 rounded-full mt-2 shrink-0"></span>
                          <span><strong>Meeting Data:</strong> Meeting titles, descriptions, scheduled times, and participant lists</span>
                        </li>
                        <li className="flex items-start gap-3">
                          <span className="w-2 h-2 bg-blue-500 rounded-full mt-2 shrink-0"></span>
                          <span><strong>Communications:</strong> Messages, chat content, and feedback you provide</span>
                        </li>
                      </ul>
                    </div>

                    <div className="bg-gray-50 dark:bg-gray-700/50 rounded-xl p-6">
                      <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-3 flex items-center gap-2">
                        <Eye className="w-5 h-5 text-purple-600 dark:text-purple-400" />
                        Automatically Collected Information
                      </h3>
                      <ul className="space-y-3 text-gray-700 dark:text-gray-300">
                        <li className="flex items-start gap-3">
                          <span className="w-2 h-2 bg-purple-500 rounded-full mt-2 shrink-0"></span>
                          <span><strong>Device Information:</strong> Browser type, operating system, device identifiers</span>
                        </li>
                        <li className="flex items-start gap-3">
                          <span className="w-2 h-2 bg-purple-500 rounded-full mt-2 shrink-0"></span>
                          <span><strong>Usage Data:</strong> Meeting history, duration, features used, and interaction patterns</span>
                        </li>
                        <li className="flex items-start gap-3">
                          <span className="w-2 h-2 bg-purple-500 rounded-full mt-2 shrink-0"></span>
                          <span><strong>Log Data:</strong> IP address, access times, pages viewed, and referring URLs</span>
                        </li>
                        <li className="flex items-start gap-3">
                          <span className="w-2 h-2 bg-purple-500 rounded-full mt-2 shrink-0"></span>
                          <span><strong>Cookies:</strong> See our <Link to="/cookies" className="text-blue-600 dark:text-blue-400 hover:underline font-medium">Cookie Policy</Link> for details</span>
                        </li>
                      </ul>
                    </div>

                    <div className="bg-gray-50 dark:bg-gray-700/50 rounded-xl p-6">
                      <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-3 flex items-center gap-2">
                        <Globe className="w-5 h-5 text-green-600 dark:text-green-400" />
                        Third-Party Information
                      </h3>
                      <ul className="space-y-3 text-gray-700 dark:text-gray-300">
                        <li className="flex items-start gap-3">
                          <span className="w-2 h-2 bg-green-500 rounded-full mt-2 shrink-0"></span>
                          <span><strong>Authentication Services:</strong> Google OAuth for sign-in (email, name, profile picture)</span>
                        </li>
                        <li className="flex items-start gap-3">
                          <span className="w-2 h-2 bg-green-500 rounded-full mt-2 shrink-0"></span>
                          <span><strong>Analytics Providers:</strong> Aggregated usage statistics and performance metrics</span>
                        </li>
                      </ul>
                    </div>
                  </div>
                </section>

                {/* How We Use Information */}
                <section id="how-we-use">
                  <div className="flex items-center gap-3 mb-4">
                    <span className="flex items-center justify-center w-8 h-8 bg-blue-100 dark:bg-blue-900/30 rounded-lg text-blue-600 dark:text-blue-400 text-sm font-bold">3</span>
                    <h2 className="text-2xl font-bold text-gray-900 dark:text-white">How We Use Your Information</h2>
                  </div>
                  
                  <div className="grid md:grid-cols-2 gap-4">
                    {[
                      { icon: Users, title: 'Service Delivery', desc: 'Enable video meetings, chat, and collaboration features' },
                      { icon: Lock, title: 'Security', desc: 'Protect accounts and prevent fraud or abuse' },
                      { icon: Bell, title: 'Communications', desc: 'Send meeting reminders and important updates' },
                      { icon: Eye, title: 'Improvements', desc: 'Analyze usage to enhance our services' },
                    ].map((item, index) => (
                      <div key={index} className="flex items-start gap-4 p-4 bg-gray-50 dark:bg-gray-700/50 rounded-xl">
                        <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
                          <item.icon className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                        </div>
                        <div>
                          <h4 className="font-semibold text-gray-900 dark:text-white">{item.title}</h4>
                          <p className="text-sm text-gray-600 dark:text-gray-400">{item.desc}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </section>

                {/* Information Sharing */}
                <section id="information-sharing">
                  <div className="flex items-center gap-3 mb-4">
                    <span className="flex items-center justify-center w-8 h-8 bg-blue-100 dark:bg-blue-900/30 rounded-lg text-blue-600 dark:text-blue-400 text-sm font-bold">4</span>
                    <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Information Sharing</h2>
                  </div>
                  
                  <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-700 rounded-xl p-6 mb-6">
                    <p className="text-amber-800 dark:text-amber-200 font-medium">
                      We do not sell your personal information. We only share data in the following circumstances:
                    </p>
                  </div>
                  
                  <ul className="space-y-4 text-gray-700 dark:text-gray-300">
                    <li className="flex items-start gap-3">
                      <span className="w-6 h-6 bg-blue-100 dark:bg-blue-900/30 rounded-full flex items-center justify-center text-blue-600 dark:text-blue-400 text-xs font-bold shrink-0">1</span>
                      <span><strong>With Your Consent:</strong> When you explicitly authorize sharing</span>
                    </li>
                    <li className="flex items-start gap-3">
                      <span className="w-6 h-6 bg-blue-100 dark:bg-blue-900/30 rounded-full flex items-center justify-center text-blue-600 dark:text-blue-400 text-xs font-bold shrink-0">2</span>
                      <span><strong>Service Providers:</strong> Third parties who help us operate our services</span>
                    </li>
                    <li className="flex items-start gap-3">
                      <span className="w-6 h-6 bg-blue-100 dark:bg-blue-900/30 rounded-full flex items-center justify-center text-blue-600 dark:text-blue-400 text-xs font-bold shrink-0">3</span>
                      <span><strong>Legal Requirements:</strong> When required by law or to protect rights</span>
                    </li>
                    <li className="flex items-start gap-3">
                      <span className="w-6 h-6 bg-blue-100 dark:bg-blue-900/30 rounded-full flex items-center justify-center text-blue-600 dark:text-blue-400 text-xs font-bold shrink-0">4</span>
                      <span><strong>Business Transfers:</strong> In connection with a merger or acquisition</span>
                    </li>
                  </ul>
                </section>

                {/* Data Security */}
                <section id="data-security">
                  <div className="flex items-center gap-3 mb-4">
                    <span className="flex items-center justify-center w-8 h-8 bg-blue-100 dark:bg-blue-900/30 rounded-lg text-blue-600 dark:text-blue-400 text-sm font-bold">5</span>
                    <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Data Security</h2>
                  </div>
                  
                  <p className="text-gray-700 dark:text-gray-300 mb-6">
                    We implement robust security measures to protect your data:
                  </p>
                  
                  <div className="grid sm:grid-cols-2 gap-4">
                    {[
                      { icon: Lock, title: 'Encryption', desc: 'End-to-end encryption for video calls and data in transit' },
                      { icon: Shield, title: 'Access Controls', desc: 'Strict authentication and authorization protocols' },
                      { icon: Server, title: 'Secure Infrastructure', desc: 'Industry-standard cloud security practices' },
                      { icon: Eye, title: 'Monitoring', desc: 'Continuous security monitoring and threat detection' },
                    ].map((item, index) => (
                      <div key={index} className="border border-gray-200 dark:border-gray-600 rounded-xl p-4">
                        <item.icon className="w-6 h-6 text-blue-600 dark:text-blue-400 mb-2" />
                        <h4 className="font-semibold text-gray-900 dark:text-white">{item.title}</h4>
                        <p className="text-sm text-gray-600 dark:text-gray-400">{item.desc}</p>
                      </div>
                    ))}
                  </div>
                </section>

                {/* Data Retention */}
                <section id="data-retention">
                  <div className="flex items-center gap-3 mb-4">
                    <span className="flex items-center justify-center w-8 h-8 bg-blue-100 dark:bg-blue-900/30 rounded-lg text-blue-600 dark:text-blue-400 text-sm font-bold">6</span>
                    <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Data Retention</h2>
                  </div>
                  
                  <p className="text-gray-700 dark:text-gray-300 mb-4">
                    We retain your personal data only for as long as necessary to fulfill the purposes for which it was collected, 
                    including legal, accounting, or reporting requirements.
                  </p>
                  
                  <div className="bg-gray-50 dark:bg-gray-700/50 rounded-xl p-6">
                    <h4 className="font-semibold text-gray-900 dark:text-white mb-3">Retention Periods:</h4>
                    <ul className="space-y-2 text-gray-700 dark:text-gray-300">
                      <li>• <strong>Account Data:</strong> Until account deletion plus 30 days</li>
                      <li>• <strong>Meeting Recordings:</strong> Based on your storage preferences</li>
                      <li>• <strong>Log Data:</strong> Up to 12 months for security purposes</li>
                      <li>• <strong>Analytics Data:</strong> Aggregated and anonymized after 24 months</li>
                    </ul>
                  </div>
                </section>

                {/* Your Rights */}
                <section id="your-rights">
                  <div className="flex items-center gap-3 mb-4">
                    <span className="flex items-center justify-center w-8 h-8 bg-blue-100 dark:bg-blue-900/30 rounded-lg text-blue-600 dark:text-blue-400 text-sm font-bold">7</span>
                    <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Your Rights</h2>
                  </div>
                  
                  <p className="text-gray-700 dark:text-gray-300 mb-6">
                    Depending on your location, you may have the following rights regarding your personal data:
                  </p>
                  
                  <div className="grid sm:grid-cols-2 gap-3">
                    {[
                      'Access your personal data',
                      'Correct inaccurate data',
                      'Delete your data',
                      'Export your data',
                      'Restrict processing',
                      'Object to processing',
                      'Withdraw consent',
                      'Lodge a complaint',
                    ].map((right, index) => (
                      <div key={index} className="flex items-center gap-3 p-3 bg-green-50 dark:bg-green-900/20 rounded-lg">
                        <span className="w-5 h-5 bg-green-500 rounded-full flex items-center justify-center">
                          <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                          </svg>
                        </span>
                        <span className="text-gray-700 dark:text-gray-300 text-sm">{right}</span>
                      </div>
                    ))}
                  </div>
                </section>

                {/* Children's Privacy */}
                <section id="children-privacy">
                  <div className="flex items-center gap-3 mb-4">
                    <span className="flex items-center justify-center w-8 h-8 bg-blue-100 dark:bg-blue-900/30 rounded-lg text-blue-600 dark:text-blue-400 text-sm font-bold">8</span>
                    <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Children's Privacy</h2>
                  </div>
                  
                  <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-700 rounded-xl p-6">
                    <p className="text-red-800 dark:text-red-200">
                      ProComm is not intended for children under 13 years of age. We do not knowingly collect personal 
                      information from children under 13. If you believe we have collected information from a child 
                      under 13, please contact us immediately.
                    </p>
                  </div>
                </section>

                {/* Policy Changes */}
                <section id="changes">
                  <div className="flex items-center gap-3 mb-4">
                    <span className="flex items-center justify-center w-8 h-8 bg-blue-100 dark:bg-blue-900/30 rounded-lg text-blue-600 dark:text-blue-400 text-sm font-bold">9</span>
                    <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Changes to This Policy</h2>
                  </div>
                  
                  <p className="text-gray-700 dark:text-gray-300">
                    We may update this Privacy Policy from time to time. We will notify you of any changes by posting 
                    the new Privacy Policy on this page and updating the "Effective Date" at the top. We encourage 
                    you to review this Privacy Policy periodically for any changes.
                  </p>
                </section>

                {/* Contact */}
                <section id="contact">
                  <div className="flex items-center gap-3 mb-4">
                    <span className="flex items-center justify-center w-8 h-8 bg-blue-100 dark:bg-blue-900/30 rounded-lg text-blue-600 dark:text-blue-400 text-sm font-bold">10</span>
                    <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Contact Us</h2>
                  </div>
                  
                  <p className="text-gray-700 dark:text-gray-300 mb-6">
                    If you have any questions about this Privacy Policy or our data practices, please contact us:
                  </p>
                  
                  <div className="bg-gradient-to-br from-blue-50 to-purple-50 dark:from-blue-900/20 dark:to-purple-900/20 rounded-xl p-6">
                    <div className="flex flex-col sm:flex-row gap-6">
                      <div className="flex items-center gap-3">
                        <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
                          <Mail className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                        </div>
                        <div>
                          <p className="text-sm text-gray-500 dark:text-gray-400">Email</p>
                          <a href="mailto:privacy@procomm.com" className="text-blue-600 dark:text-blue-400 font-medium hover:underline">
                            privacy@procomm.com
                          </a>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <div className="p-2 bg-purple-100 dark:bg-purple-900/30 rounded-lg">
                          <MessageSquare className="w-5 h-5 text-purple-600 dark:text-purple-400" />
                        </div>
                        <div>
                          <p className="text-sm text-gray-500 dark:text-gray-400">Support</p>
                          <Link to="/support" className="text-purple-600 dark:text-purple-400 font-medium hover:underline">
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
                <Link to="/terms" className="text-gray-600 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 transition-colors">
                  Terms of Service
                </Link>
                <span className="text-gray-300 dark:text-gray-600">•</span>
                <Link to="/cookies" className="text-gray-600 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 transition-colors">
                  Cookie Policy
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
          className="fixed bottom-8 right-8 p-3 bg-blue-600 hover:bg-blue-700 text-white rounded-full shadow-lg transition-all duration-300 hover:scale-110 z-40"
          aria-label="Scroll to top"
        >
          <ChevronUp className="w-6 h-6" />
        </button>
      )}
    </div>
  );
};

export default Privacy;
