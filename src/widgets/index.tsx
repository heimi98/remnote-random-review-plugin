import { declareIndexPlugin, type ReactRNPlugin, WidgetLocation } from '@remnote/plugin-sdk';
import '../style.css';
import '../index.css';

async function onActivate(plugin: ReactRNPlugin) {
  // 注册一个全局命令，用于随机打开笔记
  await plugin.app.registerCommand({
    id: 'random-review',
    name: 'Random Review: Open Random Note',
    action: async () => {
      try {
        // 获取所有笔记
        const allNotes = await plugin.rem.getAll();
        
        // 过滤出文档类型的笔记
        const allDocuments = [];
        for (const note of allNotes) {
          const isDoc = await note.isDocument();
          if (isDoc) {
            allDocuments.push(note);
          }
        }
        
        if (allDocuments.length === 0) {
          plugin.app.toast('No documents found to review.').catch(() => {});
          return;
        }
        
        // 随机选择一篇文档
        const randomIndex = Math.floor(Math.random() * allDocuments.length);
        const randomDocument = allDocuments[randomIndex];
        
        // 打开选中的文档
        await randomDocument.openRemAsPage();
        
        plugin.app.toast('Random document opened successfully!').catch(() => {});
      } catch (error) {
        console.error('Error opening random document:', error);
        plugin.app.toast('Failed to open random document. Please try again.').catch(() => {});
      }
    },
  });

  // 在左侧边栏下边添加一个带有骰子图标的按钮
  await plugin.app.registerWidget('random_review_button', WidgetLocation.SidebarEnd, {
    dimensions: { height: 'auto', width: 'auto' },
  });
}

async function onDeactivate(_: ReactRNPlugin) {}

declareIndexPlugin(onActivate, onDeactivate);
