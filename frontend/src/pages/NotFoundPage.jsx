import React from 'react';
import { Link } from 'react-router-dom';
import { HelpCircle, ArrowLeft } from 'lucide-react';
import { Button } from '../components/common/Button';

export const NotFoundPage = () => {
  return (
    <div className="min-h-[70vh] flex items-center justify-center p-4">
      <div className="max-w-md w-full text-center bg-white p-8 rounded-3xl border border-stone-200 shadow-lg space-y-4">
        <div className="w-16 h-16 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center mx-auto">
          <HelpCircle className="w-8 h-8" />
        </div>
        <h2 className="text-3xl font-black text-stone-900">404 Not Found</h2>
        <p className="text-sm text-stone-500 leading-relaxed">
          The snack, page, or resource you are looking for has been moved or doesn't exist.
        </p>
        <div className="pt-2 flex justify-center gap-3">
          <Link to="/">
            <Button size="sm">
              <ArrowLeft className="w-4 h-4 mr-1" />
              Return to Snackora Home
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
};

export default NotFoundPage;
