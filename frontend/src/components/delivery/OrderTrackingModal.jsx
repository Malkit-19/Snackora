import React, { useState, useEffect } from 'react';
import { deliveryApi } from '../../api/deliveryApi';
import { Truck, CheckCircle2, Clock, MapPin, ExternalLink, Loader2, Package, AlertCircle } from 'lucide-react';
import { Badge } from '../ui/Badge';

export const OrderTrackingModal = ({ isOpen, orderId, onClose }) => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!isOpen || !orderId) return;

    let isMounted = true;
    setLoading(true);
    setError(null);

    deliveryApi.getOrderTracking(orderId)
      .then((res) => {
        if (isMounted && res.success) {
          setData(res.data);
        }
      })
      .catch((err) => {
        if (isMounted) setError(err.message || 'Failed to load tracking data.');
      })
      .finally(() => {
        if (isMounted) setLoading(false);
      });

    return () => { isMounted = false; };
  }, [isOpen, orderId]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl max-w-lg w-full p-6 sm:p-8 space-y-6 shadow-2xl animate-in fade-in zoom-in duration-150 max-h-[90vh] overflow-y-auto">
        <div className="flex items-start justify-between pb-3 border-b border-stone-100">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
              <Truck className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-lg font-black text-stone-900">Shipment Tracking</h3>
              <p className="text-xs text-stone-400 font-medium">Order #{data?.order?.orderNumber || '...'}</p>
            </div>
          </div>
          <button onClick={onClose} className="text-stone-400 hover:text-stone-700 font-bold p-1">✕</button>
        </div>

        {loading ? (
          <div className="py-16 flex justify-center"><Loader2 className="w-8 h-8 animate-spin text-amber-500" /></div>
        ) : error ? (
          <div className="p-4 bg-rose-50 text-rose-700 rounded-2xl text-xs font-bold flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        ) : (
          <>
            {/* Courier & AWB Banner */}
            <div className="p-4 rounded-2xl bg-stone-50 border border-stone-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
              <div>
                <span className="text-[11px] text-stone-400 font-medium block">Courier Partner</span>
                <span className="font-black text-stone-900 text-sm">{data?.order?.carrier || 'Express Logistics'}</span>
                {data?.order?.trackingNumber && (
                  <span className="font-mono text-stone-500 text-[11px] block mt-0.5">AWB: {data.order.trackingNumber}</span>
                )}
              </div>

              {data?.order?.trackingUrl && (
                <a
                  href={data.order.trackingUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-3.5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs inline-flex items-center gap-1.5 transition-colors self-start sm:self-auto shadow-xs"
                >
                  Track on Courier Site <ExternalLink className="w-3.5 h-3.5" />
                </a>
              )}
            </div>

            {/* Stages Timeline */}
            <div className="space-y-3">
              <h4 className="font-bold text-stone-800 text-xs uppercase tracking-wider">Delivery Milestones</h4>
              <div className="relative pl-6 space-y-4 before:absolute before:left-2 before:top-2 before:bottom-2 before:w-0.5 before:bg-stone-200">
                {(data?.timeline || []).map((step, idx) => (
                  <div key={step.stage} className="relative flex items-start gap-3 text-xs">
                    <div className={`absolute -left-6 top-0.5 w-4 h-4 rounded-full border-2 bg-white flex items-center justify-center ${
                      step.completed ? 'border-emerald-500 bg-emerald-500 text-white' : 'border-stone-300'
                    }`}>
                      {step.completed && <CheckCircle2 className="w-3 h-3 text-white" />}
                    </div>

                    <div className="flex-1">
                      <p className={`font-bold ${step.completed ? 'text-stone-900' : 'text-stone-400'}`}>
                        {step.label}
                      </p>
                      {step.timestamp && (
                        <p className="text-[11px] text-stone-400">
                          {new Date(step.timestamp).toLocaleString('en-IN', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                        </p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Carrier Event Log */}
            {data?.events && data.events.length > 0 && (
              <div className="space-y-2 pt-2 border-t border-stone-100">
                <h4 className="font-bold text-stone-800 text-xs uppercase tracking-wider">Tracking Activities</h4>
                <div className="space-y-2 max-h-40 overflow-y-auto pr-1">
                  {data.events.map((evt, idx) => (
                    <div key={idx} className="p-2.5 rounded-xl bg-stone-50 text-[11px] space-y-0.5">
                      <div className="flex items-center justify-between text-stone-400">
                        <span className="font-bold text-stone-700">{evt.location}</span>
                        <span>{new Date(evt.timestamp).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}</span>
                      </div>
                      <p className="text-stone-600">{evt.message || evt.status}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default OrderTrackingModal;
