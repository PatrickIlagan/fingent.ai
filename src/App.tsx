import React, { useState } from 'react';
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
import { ChatSheet } from './components/ChatSheet';

export default function App() {
  const [currentTab, setCurrentTab] = useState('home');
  const [isChatOpen, setIsChatOpen] = useState(false);

  return (
    <>
      <Layout currentTab={currentTab} setCurrentTab={setCurrentTab} toggleChat={() => setIsChatOpen(true)}>
        {currentTab === 'home' && <Home onNavigate={setCurrentTab} toggleChat={() => setIsChatOpen(true)} />}
        {currentTab === 'calendar' && <Calendar />}
        {currentTab.startsWith('investments') && <Investments category={currentTab.split('-').slice(1).join('-')} onNavigate={setCurrentTab} />}
        {currentTab.startsWith('career') && <Career category={currentTab.split('-').slice(1).join('-')} onNavigate={setCurrentTab} />}
        {currentTab.startsWith('business') && <Business currentTab={currentTab} onNavigate={setCurrentTab} />}
        {(currentTab === 'freelancing' || currentTab.startsWith('freelance-')) && <Freelancing currentTab={currentTab} onNavigate={setCurrentTab} />}
        {currentTab === 'taxes' && <Taxes />}
        {currentTab.startsWith('accounts') && <Accounts category={currentTab.split('-')[1]} onNavigate={setCurrentTab} />}
        {currentTab.startsWith('liabilities') && <Liabilities category={currentTab.split('-')[1]} onNavigate={setCurrentTab} />}
        {currentTab.startsWith('plans') && <Plans category={currentTab.split('-')[1]} onNavigate={setCurrentTab} />}
        {currentTab === 'settings' && <Settings />}
      </Layout>
      <ChatSheet isOpen={isChatOpen} onClose={() => setIsChatOpen(false)} />
    </>
  );
}
