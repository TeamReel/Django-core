import type { Meta, StoryObj } from '@storybook/react';
import { useState } from 'react';
import { Modal } from './Modal';
import { Button } from '../Button';

const meta = {
  title: 'Components/Modal',
  component: Modal,
  parameters: {
    layout: 'centered',
  },
  tags: ['autodocs'],
} satisfies Meta<typeof Modal>;

export default meta;
type Story = StoryObj<typeof meta>;

function ModalWrapper(args: React.ComponentProps<typeof Modal>) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      <Button onClick={() => setIsOpen(true)}>Open Modal</Button>
      <Modal {...args} isOpen={isOpen} onClose={() => setIsOpen(false)} />
    </>
  );
}

export const Default: Story = {
  render: () => (
    <ModalWrapper title="Default Modal" onClose={() => {}}>
      <p>This is a simple modal with a title and content.</p>
      <p>Click the close button, press Escape, or click outside to close.</p>
    </ModalWrapper>
  ),
};

export const WithFooter: Story = {
  render: () => {
    const [isOpen, setIsOpen] = useState(false);

    return (
      <>
        <Button onClick={() => setIsOpen(true)}>Open Modal with Footer</Button>
        <Modal
          isOpen={isOpen}
          onClose={() => setIsOpen(false)}
          title="Confirm Action"
          footer={
            <>
              <Button variant="ghost" onClick={() => setIsOpen(false)}>
                Cancel
              </Button>
              <Button onClick={() => setIsOpen(false)}>Confirm</Button>
            </>
          }
        >
          <p>Are you sure you want to perform this action?</p>
          <p>This action cannot be undone.</p>
        </Modal>
      </>
    );
  },
};

export const NoTitle: Story = {
  render: () => (
    <ModalWrapper onClose={() => {}}>
      <h3 style={{ marginTop: 0 }}>Custom Content</h3>
      <p>This modal has no title prop, so the header is not rendered.</p>
      <p>You can include custom headings in the content.</p>
    </ModalWrapper>
  ),
};

export const DisableOverlayClick: Story = {
  render: () => (
    <ModalWrapper
      title="No Overlay Close"
      closeOnOverlayClick={false}
      onClose={() => {}}
    >
      <p>Clicking the overlay will not close this modal.</p>
      <p>You must use the close button or press Escape.</p>
    </ModalWrapper>
  ),
};

export const DisableEscapeKey: Story = {
  render: () => (
    <ModalWrapper
      title="No Escape Close"
      closeOnEscape={false}
      onClose={() => {}}
    >
      <p>Pressing Escape will not close this modal.</p>
      <p>You must use the close button or click outside.</p>
    </ModalWrapper>
  ),
};

export const LongContent: Story = {
  render: () => (
    <ModalWrapper title="Long Content Modal" onClose={() => {}}>
      <p>This modal has content that exceeds the viewport height.</p>
      <p>The content area is scrollable while the header and footer remain fixed.</p>
      {Array.from({ length: 50 }, (_, i) => (
        <p key={i}>Paragraph {i + 1} of scrollable content.</p>
      ))}
    </ModalWrapper>
  ),
};

export const LongContentWithFooter: Story = {
  render: () => {
    const [isOpen, setIsOpen] = useState(false);

    return (
      <>
        <Button onClick={() => setIsOpen(true)}>Open Scrollable Modal</Button>
        <Modal
          isOpen={isOpen}
          onClose={() => setIsOpen(false)}
          title="Scrollable Content"
          footer={
            <>
              <Button variant="ghost" onClick={() => setIsOpen(false)}>
                Cancel
              </Button>
              <Button onClick={() => setIsOpen(false)}>Accept</Button>
            </>
          }
        >
          <p>Scroll down to see more content...</p>
          {Array.from({ length: 30 }, (_, i) => (
            <p key={i}>Content paragraph {i + 1}</p>
          ))}
        </Modal>
      </>
    );
  },
};

export const NestedInteractions: Story = {
  render: () => {
    const [isOpen, setIsOpen] = useState(false);

    return (
      <>
        <Button onClick={() => setIsOpen(true)}>Open Interactive Modal</Button>
        <Modal
          isOpen={isOpen}
          onClose={() => setIsOpen(false)}
          title="Form Modal"
          footer={
            <>
              <Button variant="ghost" onClick={() => setIsOpen(false)}>
                Cancel
              </Button>
              <Button onClick={() => setIsOpen(false)}>Submit</Button>
            </>
          }
        >
          <form>
            <div style={{ marginBottom: '1rem' }}>
              <label htmlFor="name" style={{ display: 'block', marginBottom: '0.5rem' }}>
                Name
              </label>
              <input
                id="name"
                type="text"
                style={{ width: '100%', padding: '0.5rem' }}
              />
            </div>
            <div style={{ marginBottom: '1rem' }}>
              <label htmlFor="email" style={{ display: 'block', marginBottom: '0.5rem' }}>
                Email
              </label>
              <input
                id="email"
                type="email"
                style={{ width: '100%', padding: '0.5rem' }}
              />
            </div>
            <div>
              <label htmlFor="message" style={{ display: 'block', marginBottom: '0.5rem' }}>
                Message
              </label>
              <textarea
                id="message"
                rows={4}
                style={{ width: '100%', padding: '0.5rem' }}
              />
            </div>
          </form>
        </Modal>
      </>
    );
  },
};
