import { declareIndexPlugin, type ReactRNPlugin, WidgetLocation } from '@remnote/plugin-sdk';
import '../style.css';
import '../index.css';
import {
  type ReviewRating,
  openWeightedRandomDocument,
  primeRandomReviewCache,
  ratePendingReview,
  registerRandomReviewSettings,
} from '../random_review_service';

async function registerRatingCommand(plugin: ReactRNPlugin, id: string, label: string, rating: ReviewRating) {
  await plugin.app.registerCommand({
    id,
    name: `Random Review: Rate Last Opened as ${label}`,
    action: async () => {
      await ratePendingReview(plugin, rating);
    },
  });
}

async function onActivate(plugin: ReactRNPlugin) {
  await registerRandomReviewSettings(plugin);
  primeRandomReviewCache(plugin);

  // 注册一个全局命令，用于随机打开笔记
  await plugin.app.registerCommand({
    id: 'random-review',
    name: 'Random Review: Open Random Document',
    action: async () => {
      await openWeightedRandomDocument(plugin);
    },
  });

  await registerRatingCommand(plugin, 'random-review-rate-again', 'Again', 'again');
  await registerRatingCommand(plugin, 'random-review-rate-hard', 'Hard', 'hard');
  await registerRatingCommand(plugin, 'random-review-rate-good', 'Good', 'good');
  await registerRatingCommand(plugin, 'random-review-rate-easy', 'Easy', 'easy');

  // 在左侧边栏下边添加一个带有骰子图标的按钮
  await plugin.app.registerWidget('random_review_button', WidgetLocation.SidebarEnd, {
    dimensions: { height: 'auto', width: 'auto' },
  });
}

async function onDeactivate(_: ReactRNPlugin) {}

declareIndexPlugin(onActivate, onDeactivate);
