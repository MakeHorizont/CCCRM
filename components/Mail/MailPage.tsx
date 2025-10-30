
import React, { useMemo } from 'react';
import { useLocation } from 'react-router-dom';
import Card from '../UI/Card';

const ROUNDCUBE_BASE_URL = 'https://roundcube.example.com/'; // IMPORTANT: Replace with your Roundcube instance URL

const MailPage: React.FC = () => {
  const location = useLocation();
  const queryParams = new URLSearchParams(location.search);
  const recipientEmail = queryParams.get('to');

  const iframeSrc = useMemo(() => {
    if (recipientEmail) {
      // Ensure the recipientEmail is properly URI encoded for the URL
      const encodedRecipient = encodeURIComponent(recipientEmail);
      // Append Roundcube specific parameters for composing a new email
      // This might vary based on Roundcube version or plugins
      return `${ROUNDCUBE_BASE_URL}?_task=mail&_action=compose&_to=${encodedRecipient}`;
    }
    return ROUNDCUBE_BASE_URL;
  }, [recipientEmail]);

  return (
    <div className="h-full flex flex-col">
      <h1 className="text-3xl font-semibold text-brand-text-primary mb-6">Почта</h1>
      <Card className="flex-grow p-0 overflow-hidden">
        <iframe
          src={iframeSrc}
          title="Roundcube Webmail"
          className="w-full h-full border-0"
          sandbox="allow-forms allow-popups allow-pointer-lock allow-same-origin allow-scripts allow-top-navigation" // Adjust sandbox attributes as needed for Roundcube functionality
        />
      </Card>
      <p className="text-xs text-brand-text-muted mt-2 text-center">
        Примечание: Для корректной работы встроенной почты, ваш сервер Roundcube должен разрешать встраивание через iframe (X-Frame-Options).
      </p>
    </div>
  );
};

export default MailPage;
