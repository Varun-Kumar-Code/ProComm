// Temporary test component to verify Firebase meeting history
import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { addMeetingToHistory, getMeetingHistory } from '../firebase/firestoreService';

const TestMeetingHistory = () => {
  const { currentUser } = useAuth();
  const [testResult, setTestResult] = useState('');
  const [meetings, setMeetings] = useState([]);

  const testSave = async () => {
    if (!currentUser) {
      setTestResult('❌ No user logged in');
      return;
    }

    try {
      setTestResult('⏳ Saving test meeting...');
      
      const testData = {
        title: 'Test Meeting ' + new Date().getTime(),
        startedAt: new Date(),
        endedAt: new Date(Date.now() + 5 * 60 * 1000), // 5 minutes later
        participantsCount: 1
      };

      await addMeetingToHistory(currentUser.uid, testData);
      setTestResult('✅ Test meeting saved! Check console logs.');
    } catch (error) {
      setTestResult('❌ Error: ' + error.message);
      console.error('Test save error:', error);
    }
  };

  const testFetch = async () => {
    if (!currentUser) {
      setTestResult('❌ No user logged in');
      return;
    }

    try {
      setTestResult('⏳ Fetching meetings...');
      const history = await getMeetingHistory(currentUser.uid);
      setMeetings(history);
      setTestResult(`✅ Found ${history.length} meetings`);
      console.log('Fetched meetings:', history);
    } catch (error) {
      setTestResult('❌ Error: ' + error.message);
      console.error('Test fetch error:', error);
    }
  };

  return (
    <div className="min-h-screen bg-gray-100 dark:bg-gray-900 p-8">
      <div className="max-w-2xl mx-auto bg-white dark:bg-gray-800 rounded-lg p-6">
        <h1 className="text-2xl font-bold mb-6 text-gray-900 dark:text-white">
          Meeting History Test
        </h1>
        
        <div className="space-y-4">
          <button
            onClick={testSave}
            className="w-full px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
          >
            Test Save Meeting
          </button>

          <button
            onClick={testFetch}
            className="w-full px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600"
          >
            Test Fetch Meetings
          </button>

          {testResult && (
            <div className="p-4 bg-gray-100 dark:bg-gray-700 rounded">
              <p className="text-gray-900 dark:text-white">{testResult}</p>
            </div>
          )}

          {meetings.length > 0 && (
            <div className="mt-6">
              <h2 className="text-xl font-bold mb-4 text-gray-900 dark:text-white">
                Found Meetings:
              </h2>
              <div className="space-y-2">
                {meetings.map((meeting, index) => (
                  <div key={index} className="p-3 bg-gray-50 dark:bg-gray-700 rounded">
                    <p className="font-semibold text-gray-900 dark:text-white">{meeting.title}</p>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      Participants: {meeting.participantsCount}
                    </p>
                    <p className="text-xs text-gray-500 dark:text-gray-500">
                      Started: {meeting.startedAt?.toDate?.()?.toLocaleString() || 'N/A'}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default TestMeetingHistory;
