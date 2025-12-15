import React, { useState } from 'react';
import { usePlugin, renderWidget } from '@remnote/plugin-sdk';

// 随机回顾按钮组件
const RandomReviewButton = () => {
  const plugin = usePlugin();
  const [isLoading, setIsLoading] = useState(false);

  // 处理随机回顾操作
  const handleRandomReview = async () => {
    if (isLoading) return;
    
    setIsLoading(true);
    
    try {
      // 获取所有笔记
      const allNotes = await plugin.rem.getAll().catch(err => {
        console.error('Error getting notes:', err);
        return [];
      });
      
      if (!allNotes || !Array.isArray(allNotes)) {
        plugin.app.toast('Failed to get notes.').catch(() => {});
        return;
      }
      
      // 过滤出文档类型的笔记
      const allDocuments = [];
      for (const note of allNotes) {
        try {
          if (await note.isDocument().catch(() => false)) {
            allDocuments.push(note);
          }
        } catch (noteError) {
          console.error('Error checking note type:', noteError);
          continue;
        }
      }
      
      if (allDocuments.length === 0) {
        plugin.app.toast('No documents found to review.').catch(() => {});
        return;
      }
      
      // 随机选择一篇文档
      const randomIndex = Math.floor(Math.random() * allDocuments.length);
      const randomDocument = allDocuments[randomIndex];
      
      if (!randomDocument) {
        plugin.app.toast('Failed to select random document.').catch(() => {});
        return;
      }
      
      // 打开选中的文档
      await randomDocument.openRemAsPage().catch((err) => {
        console.error('Error opening document:', err);
        plugin.app.toast('Failed to open document.').catch(() => {});
      });
      
      plugin.app.toast('Random document opened successfully!').catch(() => {});
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
          padding: '12px',
          borderRadius: '50%',
          border: 'none',
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
            <circle cx="7" cy="7" r="2" fill="currentColor" />
            <circle cx="17" cy="7" r="2" fill="currentColor" />
            <circle cx="12" cy="12" r="2" fill="currentColor" />
            <circle cx="7" cy="17" r="2" fill="currentColor" />
            <circle cx="17" cy="17" r="2" fill="currentColor" />
          </svg>
        )}
      </button>
    </div>
  );
};

renderWidget(RandomReviewButton);
