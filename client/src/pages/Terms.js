import React, { useState, useEffect, useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { 
  FileText, 
  ArrowLeft, 
  Calendar, 
  CheckCircle, 
  XCircle, 
  Scale,
  ChevronUp,
  Shield,
  Cookie,
  Clock,
  Users,
  AlertTriangle,
  Ban,
  Gavel,
  Globe,
  Mail,
  MessageSquare,
  Home,
  Lock,
  RefreshCw
} from 'lucide-react';

const Terms = () => {
  const navigate = useNavigate();
  const [showScrollTop, setShowScrollTop] = useState(false);
  const [activeSection, setActiveSection] = useState('');
  const [readProgress, setReadProgress] = useState(0);

  const sections = useMemo(() => [
    { id: 'agreement', title: 'Agreement to Terms', icon: FileText },
    { id: 'eligibility', title: 'Eligibility', icon: CheckCircle },
    { id: 'account', title: 'Account & Security', icon: Lock },
    { id: 'acceptable-use', title: 'Acceptable Use', icon: CheckCircle },
    { id: 'prohibited', title: 'Prohibited Conduct', icon: Ban },
    { id: 'intellectual-property', title: 'Intellectual Property', icon: Scale },
    { id: 'disclaimer', title: 'Disclaimers', icon: AlertTriangle },
    { id: 'limitation', title: 'Limitation of Liability', icon: Shield },
    { id: 'termination', title: 'Termination', icon: XCircle },
    { id: 'governing-law', title: 'Governing Law', icon: Gavel },
    { id: 'changes', title: 'Changes to Terms', icon: RefreshCw },
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

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white dark:from-gray-900 dark:to-gray-800 transition-colors duration-300">
      {/* Progress Bar */}
      <div className="fixed top-0 left-0 w-full h-1 bg-gray-200 dark:bg-gray-700 z-50">
        <div 
          className="h-full bg-gradient-to-r from-purple-500 to-pink-600 transition-all duration-150"
          style={{ width: `${readProgress}%` }}
        />
      </div>

      {/* Header */}
      <div className="bg-gradient-to-r from-purple-600 via-purple-700 to-pink-700 text-white">
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
            <Scale className="w-10 h-10 text-white" />
          </div>
          <h1 className="text-4xl md:text-5xl font-bold mb-4">
            Terms of Service
          </h1>
          <p className="text-xl text-purple-100 mb-6 max-w-2xl mx-auto">
            Please read these terms carefully before using ProComm's services.
          </p>
          <div className="flex items-center justify-center gap-6 text-sm text-purple-200">
            <div className="flex items-center gap-2">
              <Calendar className="w-4 h-4" />
              <span>Effective: January 1, 2026</span>
            </div>
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4" />
              <span>12 min read</span>
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
                <nav className="space-y-1 max-h-96 overflow-y-auto">
                  {sections.map((section) => {
                    const Icon = section.icon;
                    return (
                      <button
                        key={section.id}
                        onClick={() => scrollToSection(section.id)}
                        className={`w-full flex items-center gap-3 px-3 py-2 text-sm rounded-lg transition-all duration-200 text-left ${
                          activeSection === section.id
                            ? 'bg-purple-50 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400 font-medium'
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
                      className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400 hover:text-purple-600 dark:hover:text-purple-400 transition-colors"
                    >
                      <Shield className="w-4 h-4" />
                      Privacy Policy
                    </Link>
                    <Link
                      to="/cookies"
                      className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400 hover:text-purple-600 dark:hover:text-purple-400 transition-colors"
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
                
                {/* Agreement to Terms */}
                <section id="agreement">
                  <div className="flex items-center gap-3 mb-4">
                    <span className="flex items-center justify-center w-8 h-8 bg-purple-100 dark:bg-purple-900/30 rounded-lg text-purple-600 dark:text-purple-400 text-sm font-bold">1</span>
                    <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Agreement to Terms</h2>
                  </div>
                  <p className="text-gray-700 dark:text-gray-300 leading-relaxed mb-4">
                    Welcome to ProComm. These Terms of Service ("Terms") govern your access to and use of ProComm's 
                    services, including our website, applications, and any related services (collectively, the "Services").
                  </p>
                  <div className="bg-purple-50 dark:bg-purple-900/20 border border-purple-200 dark:border-purple-700 rounded-xl p-6">
                    <p className="text-purple-800 dark:text-purple-200 font-medium">
                      By accessing or using our Services, you agree to be bound by these Terms. If you do not agree to 
                      these Terms, you may not access or use our Services.
                    </p>
                  </div>
                </section>

                {/* Eligibility */}
                <section id="eligibility">
                  <div className="flex items-center gap-3 mb-4">
                    <span className="flex items-center justify-center w-8 h-8 bg-purple-100 dark:bg-purple-900/30 rounded-lg text-purple-600 dark:text-purple-400 text-sm font-bold">2</span>
                    <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Eligibility</h2>
                  </div>
                  
                  <p className="text-gray-700 dark:text-gray-300 mb-6">
                    To use ProComm, you must meet the following requirements:
                  </p>
                  
                  <div className="grid sm:grid-cols-2 gap-3">
                    {[
                      'Be at least 13 years of age',
                      'Have legal capacity to enter these Terms',
                      'Not be prohibited by applicable laws',
                      'Provide accurate registration information',
                      'Maintain account security',
                    ].map((item, index) => (
                      <div key={index} className="flex items-center gap-3 p-3 bg-green-50 dark:bg-green-900/20 rounded-lg">
                        <CheckCircle className="w-5 h-5 text-green-500 shrink-0" />
                        <span className="text-gray-700 dark:text-gray-300 text-sm">{item}</span>
                      </div>
                    ))}
                  </div>
                </section>

                {/* Account & Security */}
                <section id="account">
                  <div className="flex items-center gap-3 mb-4">
                    <span className="flex items-center justify-center w-8 h-8 bg-purple-100 dark:bg-purple-900/30 rounded-lg text-purple-600 dark:text-purple-400 text-sm font-bold">3</span>
                    <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Account Registration & Security</h2>
                  </div>
                  
                  <div className="space-y-6">
                    <div className="bg-gray-50 dark:bg-gray-700/50 rounded-xl p-6">
                      <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-3 flex items-center gap-2">
                        <Users className="w-5 h-5 text-purple-600 dark:text-purple-400" />
                        Creating an Account
                      </h3>
                      <p className="text-gray-700 dark:text-gray-300">
                        You may create an account using your email address or through supported third-party authentication 
                        services (Google OAuth). You agree to provide accurate, current, and complete information during 
                        registration and keep it updated.
                      </p>
                    </div>

                    <div className="bg-gray-50 dark:bg-gray-700/50 rounded-xl p-6">
                      <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-3 flex items-center gap-2">
                        <Lock className="w-5 h-5 text-purple-600 dark:text-purple-400" />
                        Account Security
                      </h3>
                      <p className="text-gray-700 dark:text-gray-300 mb-4">You are responsible for:</p>
                      <ul className="space-y-2 text-gray-700 dark:text-gray-300">
                        <li className="flex items-start gap-3">
                          <span className="w-2 h-2 bg-purple-500 rounded-full mt-2 shrink-0"></span>
                          <span>Maintaining the confidentiality of your password</span>
                        </li>
                        <li className="flex items-start gap-3">
                          <span className="w-2 h-2 bg-purple-500 rounded-full mt-2 shrink-0"></span>
                          <span>All activities that occur under your account</span>
                        </li>
                        <li className="flex items-start gap-3">
                          <span className="w-2 h-2 bg-purple-500 rounded-full mt-2 shrink-0"></span>
                          <span>Notifying us immediately of any unauthorized access</span>
                        </li>
                        <li className="flex items-start gap-3">
                          <span className="w-2 h-2 bg-purple-500 rounded-full mt-2 shrink-0"></span>
                          <span>Ensuring your account information remains accurate</span>
                        </li>
                      </ul>
                    </div>
                  </div>
                </section>

                {/* Acceptable Use */}
                <section id="acceptable-use">
                  <div className="flex items-center gap-3 mb-4">
                    <span className="flex items-center justify-center w-8 h-8 bg-purple-100 dark:bg-purple-900/30 rounded-lg text-purple-600 dark:text-purple-400 text-sm font-bold">4</span>
                    <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Acceptable Use</h2>
                  </div>
                  
                  <p className="text-gray-700 dark:text-gray-300 mb-6">
                    You agree to use ProComm only for lawful purposes and in accordance with these Terms:
                  </p>
                  
                  <div className="grid md:grid-cols-2 gap-4">
                    {[
                      { icon: Users, title: 'Professional Communication', desc: 'Use for legitimate business and personal meetings' },
                      { icon: Shield, title: 'Respect Others', desc: 'Treat all participants with respect and dignity' },
                      { icon: Lock, title: 'Protect Privacy', desc: 'Respect the privacy of meeting participants' },
                      { icon: Globe, title: 'Follow Laws', desc: 'Comply with all applicable local and international laws' },
                    ].map((item, index) => (
                      <div key={index} className="flex items-start gap-4 p-4 bg-gray-50 dark:bg-gray-700/50 rounded-xl">
                        <div className="p-2 bg-green-100 dark:bg-green-900/30 rounded-lg">
                          <item.icon className="w-5 h-5 text-green-600 dark:text-green-400" />
                        </div>
                        <div>
                          <h4 className="font-semibold text-gray-900 dark:text-white">{item.title}</h4>
                          <p className="text-sm text-gray-600 dark:text-gray-400">{item.desc}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </section>

                {/* Prohibited Conduct */}
                <section id="prohibited">
                  <div className="flex items-center gap-3 mb-4">
                    <span className="flex items-center justify-center w-8 h-8 bg-purple-100 dark:bg-purple-900/30 rounded-lg text-purple-600 dark:text-purple-400 text-sm font-bold">5</span>
                    <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Prohibited Conduct</h2>
                  </div>
                  
                  <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-700 rounded-xl p-6 mb-6">
                    <p className="text-red-800 dark:text-red-200 font-medium mb-4">
                      The following activities are strictly prohibited:
                    </p>
                    <div className="grid sm:grid-cols-2 gap-3">
                      {[
                        'Harassment or abusive behavior',
                        'Sharing illegal or harmful content',
                        'Attempting to hack or exploit the service',
                        'Impersonating others',
                        'Spamming or sending unsolicited content',
                        'Violating intellectual property rights',
                        'Recording without consent',
                        'Using automated systems or bots',
                      ].map((item, index) => (
                        <div key={index} className="flex items-center gap-3">
                          <XCircle className="w-5 h-5 text-red-500 shrink-0" />
                          <span className="text-red-800 dark:text-red-200 text-sm">{item}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </section>

                {/* Intellectual Property */}
                <section id="intellectual-property">
                  <div className="flex items-center gap-3 mb-4">
                    <span className="flex items-center justify-center w-8 h-8 bg-purple-100 dark:bg-purple-900/30 rounded-lg text-purple-600 dark:text-purple-400 text-sm font-bold">6</span>
                    <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Intellectual Property</h2>
                  </div>
                  
                  <div className="space-y-4">
                    <div className="bg-gray-50 dark:bg-gray-700/50 rounded-xl p-6">
                      <h4 className="font-semibold text-gray-900 dark:text-white mb-2">ProComm's Rights</h4>
                      <p className="text-gray-700 dark:text-gray-300">
                        The Services, including all content, features, and functionality, are owned by ProComm and are 
                        protected by copyright, trademark, and other intellectual property laws.
                      </p>
                    </div>
                    <div className="bg-gray-50 dark:bg-gray-700/50 rounded-xl p-6">
                      <h4 className="font-semibold text-gray-900 dark:text-white mb-2">Your Content</h4>
                      <p className="text-gray-700 dark:text-gray-300">
                        You retain ownership of content you create or share through ProComm. By using our Services, 
                        you grant us a limited license to host, store, and share your content as necessary to provide 
                        the Services.
                      </p>
                    </div>
                  </div>
                </section>

                {/* Disclaimers */}
                <section id="disclaimer">
                  <div className="flex items-center gap-3 mb-4">
                    <span className="flex items-center justify-center w-8 h-8 bg-purple-100 dark:bg-purple-900/30 rounded-lg text-purple-600 dark:text-purple-400 text-sm font-bold">7</span>
                    <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Disclaimers</h2>
                  </div>
                  
                  <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-700 rounded-xl p-6">
                    <div className="flex items-start gap-3">
                      <AlertTriangle className="w-6 h-6 text-amber-600 dark:text-amber-400 shrink-0 mt-1" />
                      <div>
                        <p className="text-amber-800 dark:text-amber-200 font-medium mb-2">
                          THE SERVICES ARE PROVIDED "AS IS" AND "AS AVAILABLE"
                        </p>
                        <p className="text-amber-700 dark:text-amber-300 text-sm">
                          ProComm makes no warranties, express or implied, regarding the Services, including but not 
                          limited to implied warranties of merchantability, fitness for a particular purpose, and 
                          non-infringement. We do not warrant that the Services will be uninterrupted, secure, or error-free.
                        </p>
                      </div>
                    </div>
                  </div>
                </section>

                {/* Limitation of Liability */}
                <section id="limitation">
                  <div className="flex items-center gap-3 mb-4">
                    <span className="flex items-center justify-center w-8 h-8 bg-purple-100 dark:bg-purple-900/30 rounded-lg text-purple-600 dark:text-purple-400 text-sm font-bold">8</span>
                    <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Limitation of Liability</h2>
                  </div>
                  
                  <p className="text-gray-700 dark:text-gray-300 mb-4">
                    To the maximum extent permitted by law, ProComm shall not be liable for:
                  </p>
                  
                  <ul className="space-y-3 text-gray-700 dark:text-gray-300">
                    {[
                      'Any indirect, incidental, special, consequential, or punitive damages',
                      'Loss of profits, data, use, or goodwill',
                      'Any damages arising from your use or inability to use the Services',
                      'Any content transmitted through the Services',
                      'Any unauthorized access to or alteration of your transmissions or data',
                    ].map((item, index) => (
                      <li key={index} className="flex items-start gap-3">
                        <span className="w-6 h-6 bg-purple-100 dark:bg-purple-900/30 rounded-full flex items-center justify-center text-purple-600 dark:text-purple-400 text-xs font-bold shrink-0">{index + 1}</span>
                        <span>{item}</span>
                      </li>
                    ))}
                  </ul>
                </section>

                {/* Termination */}
                <section id="termination">
                  <div className="flex items-center gap-3 mb-4">
                    <span className="flex items-center justify-center w-8 h-8 bg-purple-100 dark:bg-purple-900/30 rounded-lg text-purple-600 dark:text-purple-400 text-sm font-bold">9</span>
                    <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Termination</h2>
                  </div>
                  
                  <div className="grid md:grid-cols-2 gap-4">
                    <div className="border border-gray-200 dark:border-gray-600 rounded-xl p-6">
                      <h4 className="font-semibold text-gray-900 dark:text-white mb-2">By You</h4>
                      <p className="text-gray-600 dark:text-gray-400 text-sm">
                        You may terminate your account at any time by deleting your account through your account settings 
                        or by contacting us.
                      </p>
                    </div>
                    <div className="border border-gray-200 dark:border-gray-600 rounded-xl p-6">
                      <h4 className="font-semibold text-gray-900 dark:text-white mb-2">By ProComm</h4>
                      <p className="text-gray-600 dark:text-gray-400 text-sm">
                        We may suspend or terminate your account if you violate these Terms or for any other reason 
                        with or without notice.
                      </p>
                    </div>
                  </div>
                </section>

                {/* Governing Law */}
                <section id="governing-law">
                  <div className="flex items-center gap-3 mb-4">
                    <span className="flex items-center justify-center w-8 h-8 bg-purple-100 dark:bg-purple-900/30 rounded-lg text-purple-600 dark:text-purple-400 text-sm font-bold">10</span>
                    <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Governing Law</h2>
                  </div>
                  
                  <p className="text-gray-700 dark:text-gray-300">
                    These Terms shall be governed by and construed in accordance with the laws of the jurisdiction in 
                    which ProComm operates, without regard to its conflict of law provisions. Any disputes arising 
                    from these Terms shall be resolved through binding arbitration or in the courts of that jurisdiction.
                  </p>
                </section>

                {/* Changes to Terms */}
                <section id="changes">
                  <div className="flex items-center gap-3 mb-4">
                    <span className="flex items-center justify-center w-8 h-8 bg-purple-100 dark:bg-purple-900/30 rounded-lg text-purple-600 dark:text-purple-400 text-sm font-bold">11</span>
                    <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Changes to Terms</h2>
                  </div>
                  
                  <p className="text-gray-700 dark:text-gray-300">
                    We reserve the right to modify these Terms at any time. We will notify you of any material changes 
                    by posting the new Terms on this page and updating the "Effective Date". Your continued use of the 
                    Services after any changes constitutes acceptance of the new Terms.
                  </p>
                </section>

                {/* Contact */}
                <section id="contact">
                  <div className="flex items-center gap-3 mb-4">
                    <span className="flex items-center justify-center w-8 h-8 bg-purple-100 dark:bg-purple-900/30 rounded-lg text-purple-600 dark:text-purple-400 text-sm font-bold">12</span>
                    <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Contact Us</h2>
                  </div>
                  
                  <p className="text-gray-700 dark:text-gray-300 mb-6">
                    If you have any questions about these Terms, please contact us:
                  </p>
                  
                  <div className="bg-gradient-to-br from-purple-50 to-pink-50 dark:from-purple-900/20 dark:to-pink-900/20 rounded-xl p-6">
                    <div className="flex flex-col sm:flex-row gap-6">
                      <div className="flex items-center gap-3">
                        <div className="p-2 bg-purple-100 dark:bg-purple-900/30 rounded-lg">
                          <Mail className="w-5 h-5 text-purple-600 dark:text-purple-400" />
                        </div>
                        <div>
                          <p className="text-sm text-gray-500 dark:text-gray-400">Email</p>
                          <a href="mailto:legal@procomm.com" className="text-purple-600 dark:text-purple-400 font-medium hover:underline">
                            legal@procomm.com
                          </a>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <div className="p-2 bg-pink-100 dark:bg-pink-900/30 rounded-lg">
                          <MessageSquare className="w-5 h-5 text-pink-600 dark:text-pink-400" />
                        </div>
                        <div>
                          <p className="text-sm text-gray-500 dark:text-gray-400">Support</p>
                          <Link to="/support" className="text-pink-600 dark:text-pink-400 font-medium hover:underline">
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
                <Link to="/privacy" className="text-gray-600 dark:text-gray-400 hover:text-purple-600 dark:hover:text-purple-400 transition-colors">
                  Privacy Policy
                </Link>
                <span className="text-gray-300 dark:text-gray-600">•</span>
                <Link to="/cookies" className="text-gray-600 dark:text-gray-400 hover:text-purple-600 dark:hover:text-purple-400 transition-colors">
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
          className="fixed bottom-8 right-8 p-3 bg-purple-600 hover:bg-purple-700 text-white rounded-full shadow-lg transition-all duration-300 hover:scale-110 z-40"
          aria-label="Scroll to top"
        >
          <ChevronUp className="w-6 h-6" />
        </button>
      )}
    </div>
  );
};

export default Terms;
