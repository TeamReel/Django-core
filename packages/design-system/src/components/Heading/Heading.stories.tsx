import type { Meta, StoryObj } from '@storybook/react';
import { Heading } from './Heading';

const meta = {
  title: 'Components/Heading',
  component: Heading,
  parameters: {
    layout: 'padded',
  },
  tags: ['autodocs'],
  argTypes: {
    level: {
      control: 'select',
      options: [1, 2, 3, 4, 5, 6],
    },
    as: {
      control: 'text',
    },
  },
} satisfies Meta<typeof Heading>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Level1: Story = {
  args: {
    level: 1,
    children: 'Heading Level 1',
  },
};

export const Level2: Story = {
  args: {
    level: 2,
    children: 'Heading Level 2',
  },
};

export const Level3: Story = {
  args: {
    level: 3,
    children: 'Heading Level 3',
  },
};

export const Level4: Story = {
  args: {
    level: 4,
    children: 'Heading Level 4',
  },
};

export const Level5: Story = {
  args: {
    level: 5,
    children: 'Heading Level 5',
  },
};

export const Level6: Story = {
  args: {
    level: 6,
    children: 'Heading Level 6',
  },
};

export const WithCustomElement: Story = {
  args: {
    level: 2,
    as: 'div',
    children: 'This is a div styled as h2',
  },
};

export const LongHeading: Story = {
  args: {
    level: 1,
    children: 'This is a very long heading that demonstrates how the typography handles longer text content',
  },
};

export const AllLevels: Story = {
  render: () => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
      <Heading level={1}>Heading Level 1</Heading>
      <Heading level={2}>Heading Level 2</Heading>
      <Heading level={3}>Heading Level 3</Heading>
      <Heading level={4}>Heading Level 4</Heading>
      <Heading level={5}>Heading Level 5</Heading>
      <Heading level={6}>Heading Level 6</Heading>
    </div>
  ),
};

export const ArticleHierarchy: Story = {
  render: () => (
    <article>
      <Heading level={1}>Article Title</Heading>
      <p style={{ margin: '0.5rem 0' }}>Introduction paragraph...</p>

      <Heading level={2}>First Section</Heading>
      <p style={{ margin: '0.5rem 0' }}>Section content...</p>

      <Heading level={3}>Subsection A</Heading>
      <p style={{ margin: '0.5rem 0' }}>Subsection content...</p>

      <Heading level={3}>Subsection B</Heading>
      <p style={{ margin: '0.5rem 0' }}>Subsection content...</p>

      <Heading level={2}>Second Section</Heading>
      <p style={{ margin: '0.5rem 0' }}>Section content...</p>

      <Heading level={4}>Minor Heading</Heading>
      <p style={{ margin: '0.5rem 0' }}>Minor content...</p>
    </article>
  ),
};
