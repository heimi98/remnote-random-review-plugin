import React, { useState } from 'react';
import { usePlugin, renderWidget } from '@remnote/plugin-sdk';
import { openWeightedRandomDocument, primeRandomReviewCache } from '../random_review_service';

// 随机回顾按钮组件
const RandomReviewButton = () => {
  const plugin = usePlugin();
  const [isLoading, setIsLoading] = useState(false);

  React.useEffect(() => {
    primeRandomReviewCache(plugin);
  }, [plugin]);

  // 处理随机回顾操作
  const handleRandomReview = async () => {
    if (isLoading) return;
    
    setIsLoading(true);
    
    try {
      await openWeightedRandomDocument(plugin);
    } catch (error) {
      console.error('Unexpected error:', error);
      plugin.app.toast('An unexpected error occurred.').catch(() => {});
    } finally {
      setIsLoading(false);
    }
  };

  // 渲染按钮和图标
  return (
    <div style={{ padding: '8px' }}>
      <button
        onClick={handleRandomReview}
        disabled={isLoading}
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '10px',
          borderRadius: '50%',
          border: 'none',
          backgroundColor: 'transparent',
          cursor: isLoading ? 'not-allowed' : 'pointer',
          transition: 'all 0.2s ease',
          boxShadow: '0 2px 4px rgba(0, 0, 0, 0.1)',
        }}
        title="Open Random Document"
      >
        {isLoading ? (
          <div style={{
            width: '24px',
            height: '24px',
            border: '2px solid currentColor',
            borderTop: '2px solid transparent',
            borderRadius: '50%',
            animation: 'spin 1s linear infinite'
          }}></div>
        ) : (
          // 简化的骰子图标，5个点
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="32"
            height="32"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
            <circle cx="8" cy="8" r="1" fill="currentColor" />
            <circle cx="16" cy="8" r="1" fill="currentColor" />
            <circle cx="12" cy="12" r="1" fill="currentColor" />
            <circle cx="8" cy="16" r="1" fill="currentColor" />
            <circle cx="16" cy="16" r="1" fill="currentColor" />
          </svg>
        )}
      </button>
    </div>
  );
};

renderWidget(RandomReviewButton);
