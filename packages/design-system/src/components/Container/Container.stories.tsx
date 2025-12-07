import type { Meta, StoryObj } from '@storybook/react';
import { Container } from './Container';

const meta = {
  title: 'Layout/Container',
  component: Container,
  parameters: {
    layout: 'fullscreen',
  },
  tags: ['autodocs'],
  decorators: [
    (Story) => (
      <div style={{ backgroundColor: '#f3f4f6', minHeight: '100vh', padding: '20px' }}>
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof Container>;

export default meta;
type Story = StoryObj<typeof meta>;

// Helper component for content visualization
const ContentBlock = () => (
  <div style={{ padding: '40px', backgroundColor: 'white', borderRadius: '8px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
    <h2 style={{ marginTop: 0, color: '#1f2937' }}>Container Content</h2>
    <p style={{ color: '#6b7280' }}>
      This content is constrained by the container's max-width. The container helps maintain readable line lengths
      and provides consistent horizontal padding.
    </p>
    <p style={{ color: '#6b7280' }}>
      Resize your browser window to see how the container responds to different viewport widths.
    </p>
  </div>
);

export const DefaultLarge: Story = {
  args: {
    children: <ContentBlock />,
  },
};

export const Small: Story = {
  args: {
    maxWidth: 'sm',
    children: <ContentBlock />,
  },
};

export const Medium: Story = {
  args: {
    maxWidth: 'md',
    children: <ContentBlock />,
  },
};

export const Large: Story = {
  args: {
    maxWidth: 'lg',
    children: <ContentBlock />,
  },
};

export const ExtraLarge: Story = {
  args: {
    maxWidth: 'xl',
    children: <ContentBlock />,
  },
};

export const FullWidth: Story = {
  args: {
    maxWidth: 'full',
    children: <ContentBlock />,
  },
};

export const SmallPadding: Story = {
  args: {
    padding: '2',
    children: <ContentBlock />,
  },
};

export const LargePadding: Story = {
  args: {
    padding: '8',
    children: <ContentBlock />,
  },
};

export const NotCentered: Story = {
  args: {
    centered: false,
    children: <ContentBlock />,
  },
};

export const ArticleLayout: Story = {
  args: {
    maxWidth: 'md',
    padding: '6',
    children: (
      <article style={{ backgroundColor: 'white', padding: '40px', borderRadius: '8px' }}>
        <h1 style={{ marginTop: 0, color: '#1f2937' }}>Article Title</h1>
        <p style={{ color: '#6b7280', fontSize: '18px', lineHeight: 1.7 }}>
          The medium container width (768px) is ideal for article content, ensuring comfortable reading
          with approximately 60-75 characters per line.
        </p>
        <p style={{ color: '#6b7280', fontSize: '18px', lineHeight: 1.7 }}>
          This creates a pleasant reading experience while making efficient use of screen space.
        </p>
      </article>
    ),
  },
};

export const DashboardLayout: Story = {
  args: {
    maxWidth: 'xl',
    padding: '6',
    children: (
      <div>
        <div style={{ marginBottom: '24px', backgroundColor: 'white', padding: '24px', borderRadius: '8px' }}>
          <h1 style={{ margin: 0, color: '#1f2937' }}>Dashboard</h1>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '24px' }}>
          <div style={{ backgroundColor: 'white', padding: '24px', borderRadius: '8px' }}>
            <h3 style={{ marginTop: 0, color: '#1f2937' }}>Widget 1</h3>
            <p style={{ color: '#6b7280' }}>Dashboard content</p>
          </div>
          <div style={{ backgroundColor: 'white', padding: '24px', borderRadius: '8px' }}>
            <h3 style={{ marginTop: 0, color: '#1f2937' }}>Widget 2</h3>
            <p style={{ color: '#6b7280' }}>Dashboard content</p>
          </div>
          <div style={{ backgroundColor: 'white', padding: '24px', borderRadius: '8px' }}>
            <h3 style={{ marginTop: 0, color: '#1f2937' }}>Widget 3</h3>
            <p style={{ color: '#6b7280' }}>Dashboard content</p>
          </div>
        </div>
      </div>
    ),
  },
};

export const NestedContainers: Story = {
  args: {
    maxWidth: 'xl',
    children: (
      <div style={{ backgroundColor: 'white', padding: '40px', borderRadius: '8px' }}>
        <h2 style={{ marginTop: 0, color: '#1f2937' }}>Outer Container (XL)</h2>
        <Container maxWidth="md" padding="6" style={{ backgroundColor: '#f9fafb', marginTop: '20px' }}>
          <h3 style={{ marginTop: 0, color: '#1f2937' }}>Inner Container (MD)</h3>
          <p style={{ color: '#6b7280' }}>
            Containers can be nested to create layered layouts with different width constraints.
          </p>
        </Container>
      </div>
    ),
  },
};

export const HeroSection: Story = {
  args: {
    maxWidth: 'lg',
    padding: '8',
    children: (
      <div style={{ textAlign: 'center', padding: '80px 0', backgroundColor: 'white', borderRadius: '8px' }}>
        <h1 style={{ fontSize: '48px', fontWeight: 'bold', margin: '0 0 16px 0', color: '#1f2937' }}>
          Welcome to Our App
        </h1>
        <p style={{ fontSize: '20px', color: '#6b7280', margin: '0 0 32px 0' }}>
          Build amazing things with our design system
        </p>
        <button style={{ padding: '12px 24px', fontSize: '16px', backgroundColor: '#3b82f6', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer' }}>
          Get Started
        </button>
      </div>
    ),
  },
};

export const FormLayout: Story = {
  args: {
    maxWidth: 'sm',
    padding: '6',
    children: (
      <form style={{ backgroundColor: 'white', padding: '32px', borderRadius: '8px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
        <h2 style={{ marginTop: 0, color: '#1f2937' }}>Sign In</h2>
        <div style={{ marginBottom: '16px' }}>
          <label style={{ display: 'block', marginBottom: '4px', color: '#374151', fontWeight: '500' }}>
            Email
          </label>
          <input
            type="email"
            style={{ width: '100%', padding: '8px 12px', border: '1px solid #d1d5db', borderRadius: '4px', fontSize: '16px' }}
            placeholder="you@example.com"
          />
        </div>
        <div style={{ marginBottom: '24px' }}>
          <label style={{ display: 'block', marginBottom: '4px', color: '#374151', fontWeight: '500' }}>
            Password
          </label>
          <input
            type="password"
            style={{ width: '100%', padding: '8px 12px', border: '1px solid #d1d5db', borderRadius: '4px', fontSize: '16px' }}
            placeholder="••••••••"
          />
        </div>
        <button
          type="submit"
          style={{ width: '100%', padding: '10px', backgroundColor: '#3b82f6', color: 'white', border: 'none', borderRadius: '4px', fontSize: '16px', fontWeight: '500', cursor: 'pointer' }}
        >
          Sign In
        </button>
      </form>
    ),
  },
};
