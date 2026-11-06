import React, { useEffect, useState } from 'react';
import { AnimatePresence, MotionConfig, motion } from 'framer-motion';
import { Layout } from './components/Layout';
import { Home } from './pages/Home';
import { Investments } from './pages/Investments';
import { Accounts } from './pages/Accounts';
import { Liabilities } from './pages/Liabilities';
import { Plans } from './pages/Plans';
import { Calendar } from './pages/Calendar';
import { Career } from './pages/Career';
import { Business } from './pages/Business';
import { Freelancing } from './pages/Freelancing';
import { Taxes } from './pages/Taxes';
import { Settings } from './pages/Settings';
import { Categories } from './pages/Categories';
import { Personal } from './pages/Personal';
import { ChatSheet } from './components/ChatSheet';
import { Celebrations } from './components/Celebrations';

export default function App() {
  const [currentTab, setCurrentTab] = useState('home');
  const [isChatOpen, setIsChatOpen] = useState(false);
  // Sub-tabs (e.g. accounts-bank) stay on the same page, so only a page change animates.
  const page = currentTab.startsWith('freelance') ? 'freelancing' : currentTab.split('-')[0];
  useEffect(() => { window.scrollTo({ top: 0 }); }, [page]);

  return (
    <MotionConfig reducedMotion="user">
      <Layout currentTab={currentTab} setCurrentTab={setCurrentTab} toggleChat={() => setIsChatOpen(true)}>
        <AnimatePresence mode="wait">
          <motion.div key={page} className="fg-page" initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0, transition: { duration: 0.26, ease: [0.22, 1, 0.36, 1] } }} exit={{ opacity: 0, y: -8, transition: { duration: 0.14 } }}>
            {currentTab === 'home' && <Home onNavigate={setCurrentTab} toggleChat={() => setIsChatOpen(true)} />}
            {currentTab === 'calendar' && <Calendar onNavigate={setCurrentTab} />}
            {currentTab.startsWith('investments') && <Investments category={currentTab.split('-').slice(1).join('-')} onNavigate={setCurrentTab} />}
            {currentTab.startsWith('career') && <Career category={currentTab.split('-').slice(1).join('-')} onNavigate={setCurrentTab} />}
            {currentTab.startsWith('business') && <Business currentTab={currentTab} onNavigate={setCurrentTab} />}
            {(currentTab === 'freelancing' || currentTab.startsWith('freelance-')) && <Freelancing currentTab={currentTab} onNavigate={setCurrentTab} />}
            {currentTab === 'taxes' && <Taxes />}
            {currentTab.startsWith('accounts') && <Accounts category={currentTab.split('-')[1]} onNavigate={setCurrentTab} />}
            {currentTab.startsWith('liabilities') && <Liabilities category={currentTab.split('-')[1]} onNavigate={setCurrentTab} />}
            {currentTab.startsWith('plans') && <Plans category={currentTab.split('-')[1]} onNavigate={setCurrentTab} />}
            {currentTab === 'categories' && <Categories />}
            {currentTab === 'personal' && <Personal />}
            {currentTab.startsWith('personal-') && <Personal category={currentTab.split('-').slice(1).join('-')} />}
            {currentTab === 'settings' && <Settings />}
          </motion.div>
        </AnimatePresence>
      </Layout>
      <ChatSheet isOpen={isChatOpen} onClose={() => setIsChatOpen(false)} onNavigate={setCurrentTab} />
      <Celebrations />
    </MotionConfig>
  );
}
