import React, { useState, useEffect, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion, useScroll, useTransform, useInView, AnimatePresence } from 'framer-motion';
import { 
  Video, 
  Users, 
  Shield, 
  Zap, 
  Monitor, 
  MessageSquare, 
  Calendar, 
  Globe,
  Headphones,
  Star,
  Check,
  ArrowRight,
  Play,
  ChevronDown,
  Moon,
  Sun,
  Menu,
  X,
  Sparkles,
  Layers,
  Clock,
  Award,
  Heart
} from 'lucide-react';

// Animation variants
const fadeInUp = {
  hidden: { opacity: 0, y: 60 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.6, ease: "easeOut" } }
};

const fadeInDown = {
  hidden: { opacity: 0, y: -60 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.6, ease: "easeOut" } }
};

const staggerContainer = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.1, delayChildren: 0.2 }
  }
};

// Animated background component
const AnimatedBackground = () => {
  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      {/* Gradient orbs */}
      <motion.div
        className="absolute top-20 left-10 w-96 h-96 bg-blue-500/30 rounded-full blur-3xl"
        animate={{
          x: [0, 50, 0],
          y: [0, 30, 0],
          scale: [1, 1.1, 1],
        }}
        transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
      />
      <motion.div
        className="absolute top-40 right-20 w-80 h-80 bg-purple-500/20 rounded-full blur-3xl"
        animate={{
          x: [0, -30, 0],
          y: [0, 50, 0],
          scale: [1, 1.2, 1],
        }}
        transition={{ duration: 10, repeat: Infinity, ease: "easeInOut" }}
      />
      <motion.div
        className="absolute bottom-20 left-1/3 w-72 h-72 bg-cyan-500/20 rounded-full blur-3xl"
        animate={{
          x: [0, 40, 0],
          y: [0, -30, 0],
          scale: [1, 1.15, 1],
        }}
        transition={{ duration: 12, repeat: Infinity, ease: "easeInOut" }}
      />
      
      {/* Grid pattern */}
      <div className="absolute inset-0 bg-[linear-gradient(rgba(59,130,246,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(59,130,246,0.03)_1px,transparent_1px)] bg-[size:60px_60px]" />
    </div>
  );
};

// Floating elements component
const FloatingElements = () => {
  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      {[...Array(6)].map((_, i) => (
        <motion.div
          key={i}
          className="absolute w-4 h-4 bg-blue-500/20 rounded-full"
          style={{
            left: `${15 + i * 15}%`,
            top: `${20 + (i % 3) * 25}%`,
          }}
          animate={{
            y: [0, -20, 0],
            opacity: [0.3, 0.6, 0.3],
          }}
          transition={{
            duration: 3 + i * 0.5,
            repeat: Infinity,
            ease: "easeInOut",
            delay: i * 0.2,
          }}
        />
      ))}
    </div>
  );
};

// Navigation component
const Navigation = ({ isDark, toggleTheme }) => {
  const [isScrolled, setIsScrolled] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  useEffect(() => {
    const handleScroll = () => setIsScrolled(window.scrollY > 50);
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <motion.nav
      initial={{ y: -100 }}
      animate={{ y: 0 }}
      transition={{ duration: 0.6 }}
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
        isScrolled 
          ? 'bg-white/80 dark:bg-gray-900/80 backdrop-blur-lg shadow-lg' 
          : 'bg-transparent'
      }`}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 md:h-20">
          {/* Logo */}
          <motion.div 
            className="flex items-center gap-2"
            whileHover={{ scale: 1.05 }}
          >
            <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-600 rounded-xl flex items-center justify-center">
              <Video className="w-6 h-6 text-white" />
            </div>
            <span className="text-xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
              ProComm
            </span>
          </motion.div>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center gap-8">
            {['Features', 'Testimonials', 'Pricing'].map((item) => (
              <motion.a
                key={item}
                href={`#${item.toLowerCase()}`}
                className="text-gray-600 dark:text-gray-300 hover:text-blue-600 dark:hover:text-blue-400 font-medium transition-colors"
                whileHover={{ y: -2 }}
              >
                {item}
              </motion.a>
            ))}
          </div>

          {/* Actions */}
          <div className="flex items-center gap-4">
            <motion.button
              onClick={toggleTheme}
              className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
              whileHover={{ scale: 1.1, rotate: 15 }}
              whileTap={{ scale: 0.9 }}
            >
              {isDark ? <Sun className="w-5 h-5 text-yellow-400" /> : <Moon className="w-5 h-5 text-gray-600" />}
            </motion.button>
            
            <Link to="/login">
              <motion.button
                className="hidden sm:block px-4 py-2 text-gray-700 dark:text-gray-300 font-medium hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
                whileHover={{ scale: 1.05 }}
              >
                Sign In
              </motion.button>
            </Link>
            
            <Link to="/login">
              <motion.button
                className="px-5 py-2.5 bg-gradient-to-r from-blue-600 to-purple-600 text-white font-semibold rounded-full shadow-lg shadow-blue-500/25 hover:shadow-blue-500/40 transition-shadow"
                whileHover={{ scale: 1.05, y: -2 }}
                whileTap={{ scale: 0.95 }}
              >
                Get Started
              </motion.button>
            </Link>

            {/* Mobile menu button */}
            <button
              className="md:hidden p-2"
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            >
              {isMobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Menu */}
      <AnimatePresence>
        {isMobileMenuOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="md:hidden bg-white dark:bg-gray-900 border-t dark:border-gray-800"
          >
            <div className="px-4 py-4 space-y-3">
              {['Features', 'Testimonials', 'Pricing'].map((item) => (
                <a
                  key={item}
                  href={`#${item.toLowerCase()}`}
                  className="block py-2 text-gray-600 dark:text-gray-300 hover:text-blue-600"
                  onClick={() => setIsMobileMenuOpen(false)}
                >
                  {item}
                </a>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.nav>
  );
};

// Hero Section
const HeroSection = () => {
  const navigate = useNavigate();
  const { scrollYProgress } = useScroll();
  const y = useTransform(scrollYProgress, [0, 1], [0, 300]);
  const opacity = useTransform(scrollYProgress, [0, 0.3], [1, 0]);

  return (
    <section className="relative min-h-screen flex items-center justify-center pt-20 overflow-hidden">
      <AnimatedBackground />
      <FloatingElements />
      
      <motion.div style={{ y, opacity }} className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
        <div className="grid lg:grid-cols-2 gap-12 items-center">
          {/* Left content */}
          <motion.div
            initial="hidden"
            animate="visible"
            variants={staggerContainer}
            className="text-center lg:text-left"
          >
            {/* Badge */}
            <motion.div variants={fadeInDown} className="inline-flex items-center gap-2 px-4 py-2 bg-blue-50 dark:bg-blue-900/30 rounded-full mb-6">
              <Sparkles className="w-4 h-4 text-blue-600 dark:text-blue-400" />
              <span className="text-sm font-medium text-blue-600 dark:text-blue-400">
                #1 Video Conferencing Platform
              </span>
            </motion.div>

            {/* Headline */}
            <motion.h1 
              variants={fadeInUp}
              className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-bold leading-tight mb-6"
            >
              <span className="text-gray-900 dark:text-white">Connect </span>
              <span className="bg-gradient-to-r from-blue-600 via-purple-600 to-cyan-600 bg-clip-text text-transparent">
                Anywhere,
              </span>
              <br />
              <span className="text-gray-900 dark:text-white">Anytime</span>
            </motion.h1>

            {/* Subheadline */}
            <motion.p 
              variants={fadeInUp}
              className="text-lg md:text-xl text-gray-600 dark:text-gray-400 mb-8 max-w-xl mx-auto lg:mx-0"
            >
              Experience crystal-clear video calls, seamless screen sharing, and powerful collaboration tools. 
              Join millions who trust ProComm for their meetings.
            </motion.p>

            {/* CTAs */}
            <motion.div variants={fadeInUp} className="flex flex-col sm:flex-row gap-4 justify-center lg:justify-start">
              <motion.button
                onClick={() => navigate('/login')}
                className="group px-8 py-4 bg-gradient-to-r from-blue-600 to-purple-600 text-white font-semibold rounded-2xl shadow-xl shadow-blue-500/25 hover:shadow-blue-500/40 transition-all flex items-center justify-center gap-2"
                whileHover={{ scale: 1.02, y: -3 }}
                whileTap={{ scale: 0.98 }}
              >
                Start Free Now
                <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
              </motion.button>
              
              <motion.button
                className="group px-8 py-4 border-2 border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 font-semibold rounded-2xl hover:border-blue-500 hover:text-blue-600 dark:hover:text-blue-400 transition-all flex items-center justify-center gap-2"
                whileHover={{ scale: 1.02, y: -3 }}
                whileTap={{ scale: 0.98 }}
              >
                <Play className="w-5 h-5" />
                Watch Demo
              </motion.button>
            </motion.div>

            {/* Stats */}
            <motion.div 
              variants={fadeInUp}
              className="mt-12 grid grid-cols-3 gap-4 sm:gap-8"
            >
              {[
                { value: '10M+', label: 'Active Users' },
                { value: '99.9%', label: 'Uptime' },
                { value: '150+', label: 'Countries' },
              ].map((stat, index) => (
                <div key={index} className="text-center lg:text-left">
                  <div className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white">
                    {stat.value}
                  </div>
                  <div className="text-sm text-gray-500 dark:text-gray-400">{stat.label}</div>
                </div>
              ))}
            </motion.div>
          </motion.div>

          {/* Right content - Hero Image/UI */}
          <motion.div
            initial={{ opacity: 0, x: 100, rotateY: -15 }}
            animate={{ opacity: 1, x: 0, rotateY: 0 }}
            transition={{ duration: 0.8, delay: 0.3 }}
            className="relative"
          >
            {/* Main card */}
            <div className="relative bg-gradient-to-br from-gray-900 to-gray-800 rounded-3xl p-1 shadow-2xl">
              <div className="bg-gradient-to-br from-gray-800 to-gray-900 rounded-3xl p-6 overflow-hidden">
                {/* Video call mockup */}
                <div className="grid grid-cols-2 gap-3">
                  {/* Main speaker */}
                  <div className="col-span-2 relative bg-gradient-to-br from-blue-600/20 to-purple-600/20 rounded-2xl aspect-video overflow-hidden">
                    <img 
                      src="https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=600&h=400&fit=crop"
                      alt="Video call participant"
                      className="w-full h-full object-cover"
                    />
                    <div className="absolute bottom-3 left-3 px-3 py-1 bg-black/50 backdrop-blur-sm rounded-full text-white text-sm font-medium">
                      Sarah Parker
                    </div>
                    <motion.div 
                      className="absolute top-3 right-3 w-3 h-3 bg-green-500 rounded-full"
                      animate={{ scale: [1, 1.2, 1] }}
                      transition={{ duration: 1.5, repeat: Infinity }}
                    />
                  </div>
                  
                  {/* Participants */}
                  {[
                    { name: 'John D.', img: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=200&h=150&fit=crop' },
                    { name: 'Emily R.', img: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=200&h=150&fit=crop' },
                  ].map((person, i) => (
                    <motion.div 
                      key={i}
                      className="relative bg-gradient-to-br from-gray-700 to-gray-800 rounded-xl aspect-video overflow-hidden"
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.5 + i * 0.1 }}
                    >
                      <img 
                        src={person.img}
                        alt={person.name}
                        className="w-full h-full object-cover"
                      />
                      <div className="absolute bottom-2 left-2 px-2 py-0.5 bg-black/50 backdrop-blur-sm rounded-full text-white text-xs">
                        {person.name}
                      </div>
                    </motion.div>
                  ))}
                </div>

                {/* Controls */}
                <div className="flex items-center justify-center gap-4 mt-4 pt-4 border-t border-gray-700">
                  {[
                    { icon: <Video className="w-5 h-5" />, active: true },
                    { icon: <Headphones className="w-5 h-5" />, active: true },
                    { icon: <Monitor className="w-5 h-5" />, active: false },
                    { icon: <MessageSquare className="w-5 h-5" />, active: false },
                  ].map((control, i) => (
                    <motion.button
                      key={i}
                      className={`p-3 rounded-full ${
                        control.active 
                          ? 'bg-gray-700 text-white' 
                          : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
                      }`}
                      whileHover={{ scale: 1.1 }}
                      whileTap={{ scale: 0.9 }}
                    >
                      {control.icon}
                    </motion.button>
                  ))}
                  <motion.button
                    className="p-3 rounded-full bg-red-500 text-white ml-4"
                    whileHover={{ scale: 1.1 }}
                    whileTap={{ scale: 0.9 }}
                  >
                    <X className="w-5 h-5" />
                  </motion.button>
                </div>
              </div>
            </div>

            {/* Floating badges */}
            <motion.div
              className="absolute -top-6 -right-6 bg-white dark:bg-gray-800 rounded-2xl p-4 shadow-xl"
              animate={{ y: [0, -10, 0] }}
              transition={{ duration: 3, repeat: Infinity }}
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center">
                  <Shield className="w-5 h-5 text-green-600" />
                </div>
                <div>
                  <div className="text-sm font-semibold text-gray-900 dark:text-white">End-to-End</div>
                  <div className="text-xs text-gray-500">Encrypted</div>
                </div>
              </div>
            </motion.div>

            <motion.div
              className="absolute -bottom-6 -left-6 bg-white dark:bg-gray-800 rounded-2xl p-4 shadow-xl"
              animate={{ y: [0, 10, 0] }}
              transition={{ duration: 4, repeat: Infinity }}
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-blue-100 dark:bg-blue-900/30 rounded-full flex items-center justify-center">
                  <Users className="w-5 h-5 text-blue-600" />
                </div>
                <div>
                  <div className="text-sm font-semibold text-gray-900 dark:text-white">500+</div>
                  <div className="text-xs text-gray-500">Participants</div>
                </div>
              </div>
            </motion.div>
          </motion.div>
        </div>

        {/* Scroll indicator */}
        <motion.div 
          className="absolute bottom-10 left-1/2 -translate-x-1/2"
          animate={{ y: [0, 10, 0] }}
          transition={{ duration: 1.5, repeat: Infinity }}
        >
          <ChevronDown className="w-6 h-6 text-gray-400" />
        </motion.div>
      </motion.div>
    </section>
  );
};

// Features Section
const FeaturesSection = () => {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: "-100px" });

  const features = [
    {
      icon: <Video className="w-7 h-7" />,
      title: "Crystal Clear HD Video",
      description: "Experience stunning 4K video quality with smart bandwidth optimization for smooth calls anywhere.",
      color: "blue",
      image: "https://images.unsplash.com/photo-1516321318423-f06f85e504b3?w=400&h=300&fit=crop"
    },
    {
      icon: <Monitor className="w-7 h-7" />,
      title: "Seamless Screen Sharing",
      description: "Share your entire screen, specific windows, or application tabs with just one click.",
      color: "purple",
      image: "https://images.unsplash.com/photo-1531403009284-440f080d1e12?w=400&h=300&fit=crop"
    },
    {
      icon: <MessageSquare className="w-7 h-7" />,
      title: "Real-time Chat & Reactions",
      description: "Engage with in-meeting chat, emoji reactions, and hand raising features.",
      color: "green",
      image: "https://images.unsplash.com/photo-1611606063065-ee7946f0787a?w=400&h=300&fit=crop"
    },
    {
      icon: <Shield className="w-7 h-7" />,
      title: "Enterprise Security",
      description: "End-to-end encryption, SSO integration, and advanced admin controls for peace of mind.",
      color: "red",
      image: "https://images.unsplash.com/photo-1563013544-824ae1b704d3?w=400&h=300&fit=crop"
    },
    {
      icon: <Calendar className="w-7 h-7" />,
      title: "Smart Scheduling",
      description: "Integrate with your calendar, set recurring meetings, and send automated reminders.",
      color: "yellow",
      image: "https://images.unsplash.com/photo-1506784983877-45594efa4cbe?w=400&h=300&fit=crop"
    },
    {
      icon: <Layers className="w-7 h-7" />,
      title: "Virtual Backgrounds",
      description: "Professional backgrounds, blur effects, and custom images to look great in any setting.",
      color: "cyan",
      image: "https://images.unsplash.com/photo-1497366216548-37526070297c?w=400&h=300&fit=crop"
    },
  ];

  const colorVariants = {
    blue: "from-blue-500 to-blue-600 bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400",
    purple: "from-purple-500 to-purple-600 bg-purple-50 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400",
    green: "from-green-500 to-green-600 bg-green-50 dark:bg-green-900/30 text-green-600 dark:text-green-400",
    red: "from-red-500 to-red-600 bg-red-50 dark:bg-red-900/30 text-red-600 dark:text-red-400",
    yellow: "from-yellow-500 to-yellow-600 bg-yellow-50 dark:bg-yellow-900/30 text-yellow-600 dark:text-yellow-400",
    cyan: "from-cyan-500 to-cyan-600 bg-cyan-50 dark:bg-cyan-900/30 text-cyan-600 dark:text-cyan-400",
  };

  return (
    <section id="features" className="py-24 relative overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-b from-transparent via-blue-50/30 to-transparent dark:via-blue-900/10" />
      
      <div ref={ref} className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        {/* Section header */}
        <motion.div
          initial="hidden"
          animate={isInView ? "visible" : "hidden"}
          variants={staggerContainer}
          className="text-center mb-16"
        >
          <motion.span 
            variants={fadeInUp}
            className="inline-flex items-center gap-2 px-4 py-2 bg-blue-50 dark:bg-blue-900/30 rounded-full text-sm font-medium text-blue-600 dark:text-blue-400 mb-4"
          >
            <Zap className="w-4 h-4" />
            Powerful Features
          </motion.span>
          <motion.h2 
            variants={fadeInUp}
            className="text-3xl md:text-4xl lg:text-5xl font-bold text-gray-900 dark:text-white mb-6"
          >
            Everything You Need to
            <br />
            <span className="bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
              Connect & Collaborate
            </span>
          </motion.h2>
          <motion.p 
            variants={fadeInUp}
            className="text-lg text-gray-600 dark:text-gray-400 max-w-2xl mx-auto"
          >
            ProComm brings together all the tools you need for productive virtual meetings, 
            from HD video to advanced collaboration features.
          </motion.p>
        </motion.div>

        {/* Features grid */}
        <motion.div
          initial="hidden"
          animate={isInView ? "visible" : "hidden"}
          variants={staggerContainer}
          className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 lg:gap-8"
        >
          {features.map((feature, index) => (
            <motion.div
              key={index}
              variants={fadeInUp}
              className="group relative bg-white dark:bg-gray-800 rounded-3xl overflow-hidden shadow-lg hover:shadow-2xl transition-all duration-500"
              whileHover={{ y: -8 }}
            >
              {/* Image */}
              <div className="h-48 overflow-hidden">
                <motion.img
                  src={feature.image}
                  alt={feature.title}
                  className="w-full h-full object-cover"
                  whileHover={{ scale: 1.1 }}
                  transition={{ duration: 0.5 }}
                />
                <div className="absolute inset-0 bg-gradient-to-t from-white dark:from-gray-800 to-transparent" />
              </div>

              {/* Content */}
              <div className="p-6 -mt-12 relative z-10">
                <div className={`w-14 h-14 rounded-2xl flex items-center justify-center mb-4 ${colorVariants[feature.color].split(' ').slice(2).join(' ')}`}>
                  {feature.icon}
                </div>
                <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">
                  {feature.title}
                </h3>
                <p className="text-gray-600 dark:text-gray-400">
                  {feature.description}
                </p>
              </div>

              {/* Hover gradient border */}
              <div className={`absolute inset-0 rounded-3xl bg-gradient-to-r ${colorVariants[feature.color].split(' ').slice(0, 2).join(' ')} opacity-0 group-hover:opacity-100 transition-opacity duration-300 -z-10 blur-xl`} />
            </motion.div>
          ))}
        </motion.div>
      </div>
    </section>
  );
};

// How It Works Section
const HowItWorksSection = () => {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: "-100px" });

  const steps = [
    {
      step: "01",
      title: "Create Account",
      description: "Sign up in seconds with your email or Google account. No credit card required.",
      icon: <Users className="w-6 h-6" />
    },
    {
      step: "02",
      title: "Start or Join Meeting",
      description: "Create a new meeting instantly or join one with a simple meeting code.",
      icon: <Video className="w-6 h-6" />
    },
    {
      step: "03",
      title: "Collaborate",
      description: "Share screens, chat, and work together in real-time with your team.",
      icon: <Monitor className="w-6 h-6" />
    },
  ];

  return (
    <section className="py-24 bg-gradient-to-b from-gray-50 to-white dark:from-gray-900 dark:to-gray-800">
      <div ref={ref} className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <motion.div
          initial="hidden"
          animate={isInView ? "visible" : "hidden"}
          variants={staggerContainer}
          className="text-center mb-16"
        >
          <motion.span 
            variants={fadeInUp}
            className="inline-flex items-center gap-2 px-4 py-2 bg-purple-50 dark:bg-purple-900/30 rounded-full text-sm font-medium text-purple-600 dark:text-purple-400 mb-4"
          >
            <Clock className="w-4 h-4" />
            Get Started in Minutes
          </motion.span>
          <motion.h2 
            variants={fadeInUp}
            className="text-3xl md:text-4xl lg:text-5xl font-bold text-gray-900 dark:text-white"
          >
            How It Works
          </motion.h2>
        </motion.div>

        <motion.div
          initial="hidden"
          animate={isInView ? "visible" : "hidden"}
          variants={staggerContainer}
          className="grid md:grid-cols-3 gap-8"
        >
          {steps.map((item, index) => (
            <motion.div
              key={index}
              variants={fadeInUp}
              className="relative"
            >
              {/* Connector line */}
              {index < steps.length - 1 && (
                <div className="hidden md:block absolute top-12 left-1/2 w-full h-0.5 bg-gradient-to-r from-blue-500 to-purple-500" />
              )}
              
              <div className="relative z-10 text-center">
                <motion.div
                  className="w-24 h-24 mx-auto mb-6 bg-gradient-to-br from-blue-500 to-purple-600 rounded-3xl flex items-center justify-center text-white shadow-lg"
                  whileHover={{ scale: 1.1, rotate: 5 }}
                >
                  <span className="text-3xl font-bold">{item.step}</span>
                </motion.div>
                <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-3">
                  {item.title}
                </h3>
                <p className="text-gray-600 dark:text-gray-400">
                  {item.description}
                </p>
              </div>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </section>
  );
};

// Testimonials Section
const TestimonialsSection = () => {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: "-100px" });

  const testimonials = [
    {
      quote: "ProComm has transformed how our remote team collaborates. The video quality is incredible and the interface is so intuitive.",
      author: "Sarah Johnson",
      role: "CEO, TechStart Inc.",
      avatar: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=100&h=100&fit=crop",
      rating: 5
    },
    {
      quote: "We switched from our previous solution and haven't looked back. The screen sharing and recording features are game-changers.",
      author: "Michael Chen",
      role: "Product Manager, InnovateCo",
      avatar: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100&h=100&fit=crop",
      rating: 5
    },
    {
      quote: "The enterprise security features give us peace of mind for all our confidential client meetings. Highly recommended!",
      author: "Emily Rodriguez",
      role: "CTO, SecureData Ltd.",
      avatar: "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=100&h=100&fit=crop",
      rating: 5
    },
  ];

  return (
    <section id="testimonials" className="py-24 relative overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-b from-transparent via-purple-50/30 to-transparent dark:via-purple-900/10" />
      
      <div ref={ref} className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        <motion.div
          initial="hidden"
          animate={isInView ? "visible" : "hidden"}
          variants={staggerContainer}
          className="text-center mb-16"
        >
          <motion.span 
            variants={fadeInUp}
            className="inline-flex items-center gap-2 px-4 py-2 bg-pink-50 dark:bg-pink-900/30 rounded-full text-sm font-medium text-pink-600 dark:text-pink-400 mb-4"
          >
            <Heart className="w-4 h-4" />
            Loved by Teams
          </motion.span>
          <motion.h2 
            variants={fadeInUp}
            className="text-3xl md:text-4xl lg:text-5xl font-bold text-gray-900 dark:text-white mb-6"
          >
            What Our Users Say
          </motion.h2>
          <motion.p 
            variants={fadeInUp}
            className="text-lg text-gray-600 dark:text-gray-400 max-w-2xl mx-auto"
          >
            Join thousands of satisfied teams already using ProComm for their daily communications.
          </motion.p>
        </motion.div>

        <motion.div
          initial="hidden"
          animate={isInView ? "visible" : "hidden"}
          variants={staggerContainer}
          className="grid md:grid-cols-3 gap-8"
        >
          {testimonials.map((testimonial, index) => (
            <motion.div
              key={index}
              variants={fadeInUp}
              className="bg-white dark:bg-gray-800 rounded-3xl p-8 shadow-lg hover:shadow-xl transition-shadow relative overflow-hidden group"
              whileHover={{ y: -5 }}
            >
              {/* Quote mark */}
              <div className="absolute top-4 right-4 text-6xl font-serif text-blue-100 dark:text-blue-900/30">
                "
              </div>
              
              {/* Stars */}
              <div className="flex gap-1 mb-4">
                {[...Array(testimonial.rating)].map((_, i) => (
                  <Star key={i} className="w-5 h-5 fill-yellow-400 text-yellow-400" />
                ))}
              </div>

              <p className="text-gray-700 dark:text-gray-300 mb-6 relative z-10">
                "{testimonial.quote}"
              </p>

              <div className="flex items-center gap-4">
                <img
                  src={testimonial.avatar}
                  alt={testimonial.author}
                  className="w-12 h-12 rounded-full object-cover ring-2 ring-blue-500/20"
                />
                <div>
                  <div className="font-semibold text-gray-900 dark:text-white">
                    {testimonial.author}
                  </div>
                  <div className="text-sm text-gray-500 dark:text-gray-400">
                    {testimonial.role}
                  </div>
                </div>
              </div>

              {/* Hover effect */}
              <div className="absolute inset-0 bg-gradient-to-r from-blue-500/5 to-purple-500/5 opacity-0 group-hover:opacity-100 transition-opacity" />
            </motion.div>
          ))}
        </motion.div>

        {/* Logos */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={isInView ? { opacity: 1 } : {}}
          transition={{ delay: 0.5 }}
          className="mt-16 pt-16 border-t border-gray-200 dark:border-gray-700"
        >
          <p className="text-center text-sm text-gray-500 dark:text-gray-400 mb-8">
            TRUSTED BY TEAMS AT
          </p>
          <div className="flex flex-wrap justify-center items-center gap-8 md:gap-16 opacity-50">
            {['Google', 'Microsoft', 'Apple', 'Amazon', 'Meta'].map((company, i) => (
              <motion.span
                key={i}
                className="text-xl md:text-2xl font-bold text-gray-400 dark:text-gray-600"
                whileHover={{ scale: 1.1, opacity: 1 }}
              >
                {company}
              </motion.span>
            ))}
          </div>
        </motion.div>
      </div>
    </section>
  );
};

// Pricing Section
const PricingSection = () => {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: "-100px" });
  const [isAnnual, setIsAnnual] = useState(true);

  const plans = [
    {
      name: "Basic",
      description: "Perfect for personal use",
      price: { monthly: 0, annual: 0 },
      features: [
        "40-minute group meetings",
        "100 participants per meeting",
        "Chat & reactions",
        "Screen sharing",
        "Virtual backgrounds"
      ],
      cta: "Get Started Free",
      popular: false,
      color: "gray"
    },
    {
      name: "Pro",
      description: "Best for small teams",
      price: { monthly: 15, annual: 12 },
      features: [
        "Unlimited meeting duration",
        "300 participants per meeting",
        "Cloud recording (5GB)",
        "Custom branding",
        "Admin dashboard",
        "Priority support"
      ],
      cta: "Start Free Trial",
      popular: true,
      color: "blue"
    },
    {
      name: "Enterprise",
      description: "For large organizations",
      price: { monthly: 25, annual: 20 },
      features: [
        "Everything in Pro",
        "500 participants per meeting",
        "Unlimited cloud storage",
        "SSO & advanced security",
        "Dedicated success manager",
        "Custom integrations",
        "99.99% uptime SLA"
      ],
      cta: "Contact Sales",
      popular: false,
      color: "purple"
    }
  ];

  return (
    <section id="pricing" className="py-24 bg-gradient-to-b from-gray-50 to-white dark:from-gray-900 dark:to-gray-800">
      <div ref={ref} className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <motion.div
          initial="hidden"
          animate={isInView ? "visible" : "hidden"}
          variants={staggerContainer}
          className="text-center mb-12"
        >
          <motion.span 
            variants={fadeInUp}
            className="inline-flex items-center gap-2 px-4 py-2 bg-green-50 dark:bg-green-900/30 rounded-full text-sm font-medium text-green-600 dark:text-green-400 mb-4"
          >
            <Award className="w-4 h-4" />
            Simple Pricing
          </motion.span>
          <motion.h2 
            variants={fadeInUp}
            className="text-3xl md:text-4xl lg:text-5xl font-bold text-gray-900 dark:text-white mb-6"
          >
            Choose Your Plan
          </motion.h2>
          <motion.p 
            variants={fadeInUp}
            className="text-lg text-gray-600 dark:text-gray-400 max-w-2xl mx-auto mb-8"
          >
            Start free and scale as you grow. All plans include our core features.
          </motion.p>

          {/* Toggle */}
          <motion.div 
            variants={fadeInUp}
            className="inline-flex items-center gap-4 p-1 bg-gray-100 dark:bg-gray-800 rounded-full"
          >
            <button
              onClick={() => setIsAnnual(false)}
              className={`px-4 py-2 rounded-full transition-all ${
                !isAnnual 
                  ? 'bg-white dark:bg-gray-700 shadow text-gray-900 dark:text-white' 
                  : 'text-gray-600 dark:text-gray-400'
              }`}
            >
              Monthly
            </button>
            <button
              onClick={() => setIsAnnual(true)}
              className={`px-4 py-2 rounded-full transition-all ${
                isAnnual 
                  ? 'bg-white dark:bg-gray-700 shadow text-gray-900 dark:text-white' 
                  : 'text-gray-600 dark:text-gray-400'
              }`}
            >
              Annual <span className="text-green-500 text-sm font-medium">-20%</span>
            </button>
          </motion.div>
        </motion.div>

        <motion.div
          initial="hidden"
          animate={isInView ? "visible" : "hidden"}
          variants={staggerContainer}
          className="grid md:grid-cols-3 gap-8"
        >
          {plans.map((plan, index) => (
            <motion.div
              key={index}
              variants={fadeInUp}
              className={`relative bg-white dark:bg-gray-800 rounded-3xl p-8 shadow-lg ${
                plan.popular ? 'ring-2 ring-blue-500 scale-105 z-10' : ''
              }`}
              whileHover={{ y: -5 }}
            >
              {plan.popular && (
                <div className="absolute -top-4 left-1/2 -translate-x-1/2 px-4 py-1 bg-gradient-to-r from-blue-500 to-purple-500 text-white text-sm font-semibold rounded-full">
                  Most Popular
                </div>
              )}

              <div className="text-center mb-8">
                <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">
                  {plan.name}
                </h3>
                <p className="text-gray-500 dark:text-gray-400 text-sm mb-4">
                  {plan.description}
                </p>
                <div className="flex items-end justify-center gap-1">
                  <span className="text-4xl font-bold text-gray-900 dark:text-white">
                    ${isAnnual ? plan.price.annual : plan.price.monthly}
                  </span>
                  <span className="text-gray-500 dark:text-gray-400 mb-1">
                    /month
                  </span>
                </div>
              </div>

              <ul className="space-y-4 mb-8">
                {plan.features.map((feature, i) => (
                  <li key={i} className="flex items-center gap-3 text-gray-700 dark:text-gray-300">
                    <Check className="w-5 h-5 text-green-500 shrink-0" />
                    {feature}
                  </li>
                ))}
              </ul>

              <Link to="/login">
                <motion.button
                  className={`w-full py-3 rounded-xl font-semibold transition-all ${
                    plan.popular
                      ? 'bg-gradient-to-r from-blue-600 to-purple-600 text-white shadow-lg shadow-blue-500/25 hover:shadow-blue-500/40'
                      : 'bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-white hover:bg-gray-200 dark:hover:bg-gray-600'
                  }`}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                >
                  {plan.cta}
                </motion.button>
              </Link>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </section>
  );
};

// CTA Section
const CTASection = () => {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: "-100px" });

  return (
    <section className="py-24 relative overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-r from-blue-600 to-purple-600" />
      <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.1)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.1)_1px,transparent_1px)] bg-[size:40px_40px]" />
      
      <motion.div
        ref={ref}
        initial="hidden"
        animate={isInView ? "visible" : "hidden"}
        variants={staggerContainer}
        className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center relative z-10"
      >
        <motion.h2 
          variants={fadeInUp}
          className="text-3xl md:text-4xl lg:text-5xl font-bold text-white mb-6"
        >
          Ready to Transform Your Meetings?
        </motion.h2>
        <motion.p 
          variants={fadeInUp}
          className="text-xl text-blue-100 mb-10 max-w-2xl mx-auto"
        >
          Join millions of teams already using ProComm for seamless collaboration. Start your free account today.
        </motion.p>
        <motion.div 
          variants={fadeInUp}
          className="flex flex-col sm:flex-row gap-4 justify-center"
        >
          <Link to="/login">
            <motion.button
              className="px-8 py-4 bg-white text-blue-600 font-semibold rounded-2xl shadow-xl hover:shadow-2xl transition-all flex items-center justify-center gap-2"
              whileHover={{ scale: 1.05, y: -3 }}
              whileTap={{ scale: 0.95 }}
            >
              Get Started Free
              <ArrowRight className="w-5 h-5" />
            </motion.button>
          </Link>
          <motion.button
            className="px-8 py-4 border-2 border-white/30 text-white font-semibold rounded-2xl hover:bg-white/10 transition-all"
            whileHover={{ scale: 1.05, y: -3 }}
            whileTap={{ scale: 0.95 }}
          >
            Schedule a Demo
          </motion.button>
        </motion.div>
      </motion.div>
    </section>
  );
};

// Footer
const Footer = () => {
  const footerLinks = {
    Product: ['Features', 'Pricing', 'Security', 'Enterprise'],
    Company: ['About', 'Blog', 'Careers', 'Press'],
    Resources: ['Help Center', 'Contact', 'Community', 'Status'],
    Legal: ['Privacy', 'Terms', 'Cookies', 'Licenses']
  };

  return (
    <footer className="bg-gray-900 text-gray-400 py-16">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-2 md:grid-cols-5 gap-8 mb-12">
          {/* Brand */}
          <div className="col-span-2 md:col-span-1">
            <div className="flex items-center gap-2 mb-4">
              <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-600 rounded-xl flex items-center justify-center">
                <Video className="w-6 h-6 text-white" />
              </div>
              <span className="text-xl font-bold text-white">ProComm</span>
            </div>
            <p className="text-sm mb-4">
              Connect, collaborate, and communicate with crystal-clear video conferencing.
            </p>
            <div className="flex gap-4">
              {['Twitter', 'LinkedIn', 'GitHub'].map((social, i) => (
                <motion.a
                  key={i}
                  href="#"
                  className="w-10 h-10 bg-gray-800 rounded-full flex items-center justify-center hover:bg-gray-700 transition-colors"
                  whileHover={{ scale: 1.1, y: -2 }}
                >
                  <Globe className="w-5 h-5" />
                </motion.a>
              ))}
            </div>
          </div>

          {/* Links */}
          {Object.entries(footerLinks).map(([category, links]) => (
            <div key={category}>
              <h4 className="text-white font-semibold mb-4">{category}</h4>
              <ul className="space-y-2">
                {links.map((link, i) => (
                  <li key={i}>
                    <Link 
                      to={link === 'Privacy' ? '/privacy' : link === 'Terms' ? '/terms' : link === 'Cookies' ? '/cookies' : '#'}
                      className="hover:text-white transition-colors"
                    >
                      {link}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="pt-8 border-t border-gray-800 flex flex-col md:flex-row justify-between items-center gap-4">
          <p className="text-sm">
            © 2026 ProComm. All rights reserved.
          </p>
          <div className="flex items-center gap-4 text-sm">
            <Link to="/privacy" className="hover:text-white transition-colors">Privacy Policy</Link>
            <span>•</span>
            <Link to="/terms" className="hover:text-white transition-colors">Terms of Service</Link>
            <span>•</span>
            <Link to="/cookies" className="hover:text-white transition-colors">Cookies</Link>
          </div>
        </div>
      </div>
    </footer>
  );
};

// Main Landing Page Component
const LandingPage = () => {
  const [isDark, setIsDark] = useState(() => {
    if (typeof window !== 'undefined') {
      return document.documentElement.classList.contains('dark');
    }
    return false;
  });

  const toggleTheme = () => {
    setIsDark(!isDark);
    document.documentElement.classList.toggle('dark');
    localStorage.setItem('darkMode', !isDark);
  };

  useEffect(() => {
    const savedTheme = localStorage.getItem('darkMode');
    if (savedTheme === 'true') {
      setIsDark(true);
      document.documentElement.classList.add('dark');
    }
  }, []);

  return (
    <div className="min-h-screen bg-white dark:bg-gray-900 transition-colors duration-300">
      <Navigation isDark={isDark} toggleTheme={toggleTheme} />
      <HeroSection />
      <FeaturesSection />
      <HowItWorksSection />
      <TestimonialsSection />
      <PricingSection />
      <CTASection />
      <Footer />
    </div>
  );
};

export default LandingPage;
