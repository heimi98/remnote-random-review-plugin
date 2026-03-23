import { declareIndexPlugin, type ReactRNPlugin, WidgetLocation } from '@remnote/plugin-sdk';
import '../style.css';
import '../index.css';
import { openWeightedRandomDocument, primeRandomReviewCache } from '../random_review_service';

async function onActivate(plugin: ReactRNPlugin) {
  primeRandomReviewCache(plugin);

  // 注册一个全局命令，用于随机打开笔记
  await plugin.app.registerCommand({
    id: 'random-review',
    name: 'Random Review: Open Random Document',
    action: async () => {
      await openWeightedRandomDocument(plugin);
    },
  });

  // 在左侧边栏下边添加一个带有骰子图标的按钮
  await plugin.app.registerWidget('random_review_button', WidgetLocation.SidebarEnd, {
    dimensions: { height: 'auto', width: 'auto' },
  });
}

async function onDeactivate(_: ReactRNPlugin) {}

declareIndexPlugin(onActivate, onDeactivate);
