import React from 'react';
import { Link } from 'react-router-dom';
import { ShieldAlert, ArrowLeft } from 'lucide-react';
import { Button } from '../components/common/Button';

export const UnauthorizedPage = () => {
  return (
    <div className="min-h-[70vh] flex items-center justify-center p-4">
      <div className="max-w-md w-full text-center bg-white p-8 rounded-3xl border border-stone-200 shadow-lg space-y-4">
        <div className="w-16 h-16 rounded-2xl bg-red-50 text-red-600 flex items-center justify-center mx-auto">
          <ShieldAlert className="w-8 h-8" />
        </div>
        <h2 className="text-2xl font-black text-stone-900">Access Restricted</h2>
        <p className="text-sm text-stone-500 leading-relaxed">
          You do not have permission to view this section. This page requires elevated administrative or wholesale credentials.
        </p>
        <div className="pt-2 flex justify-center gap-3">
          <Link to="/">
            <Button variant="secondary" size="sm">
              <ArrowLeft className="w-4 h-4 mr-1" />
              Back Home
            </Button>
          </Link>
          <Link to="/login">
            <Button size="sm">Sign In With Another Account</Button>
          </Link>
        </div>
      </div>
    </div>
  );
};

export default UnauthorizedPage;
