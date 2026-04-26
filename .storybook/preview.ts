import type { Preview } from '@storybook/react';
import '../src/styles/index.css';

const preview: Preview = {
  parameters: {
    layout: 'fullscreen',
    backgrounds: {
      default: 'canvas',
      values: [
        { name: 'canvas', value: '#F7FBF4' },
        { name: 'dark', value: '#0F172A' },
      ],
    },
  },
};

export default preview;
