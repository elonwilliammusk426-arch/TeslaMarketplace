import React, { useMemo, useState } from 'react';

const API_URL = (import.meta.env.VITE_API_URL || '').replace(/\/$/, '');

const COLOR_OPTIONS = [
  { id: 'white', name: 'Pearl White Multi-Coat', price: 0, hex: '#ffffff' },
  { id: 'blue', name: 'Deep Blue Metallic', price: 1000, hex: '#00205b' },
  { id: 'black', name: 'Solid Black', price: 1500, hex: '#000000' }
];

const FSD_PRICE = 8000;
const BASE_PRICE = 44990;

export default function CarConfigurator() {
  const [selectedColor, setSelectedColor] = useState(COLOR_OPTIONS[0]);
  const [hasFSD, setHasFSD] = useState(false);
  const [email, setEmail] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const totalPrice = useMemo(
    () => BASE_PRICE + selectedColor.price + (hasFSD ? FSD_PRICE : 0),
    [selectedColor.price, hasFSD]
  );

  const handleOrderSubmit = async () => {
    setError('');
    setMessage('');

    if (!email.trim()) {
      setError('Enter your email address before ordering.');
      return;
    }

    setSubmitting(true);
    try {
      const response = await fetch(`${API_URL}/api/orders`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          customer: { email: email.trim() },
          vehicleId: 'model-y',
          configuration: {
            model: 'Model Y',
            color: selectedColor.name,
            hasFSD
          },
          total: totalPrice,
          depositAmount: 250
        })
      });

      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.error || 'Unable to create your order.');

      setMessage(`Order created: ${data.order?.trackingId || data.trackingId || data.orderId}`);
    } catch (requestError) {
      setError(requestError.message || 'Unable to create your order.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <section className="configurator">
      <div className="configurator-viewer" aria-label="Model Y preview">
        <div
          className="car-preview"
          style={{ '--car-paint': selectedColor.hex }}
          role="img"
          aria-label={`${selectedColor.name} Model Y preview`}
        >
          <div className="car-roof" />
          <div className="car-body" />
          <div className="car-wheel wheel-left" />
          <div className="car-wheel wheel-right" />
        </div>
      </div>

      <div className="configurator-panel">
        <span className="eyebrow">TeslaMarketplace</span>
        <h2>Configure your Model Y</h2>
        <p className="muted">Build your vehicle, review the price, then place your order.</p>

        <div className="price-card">
          <span>Estimated vehicle price</span>
          <strong>${totalPrice.toLocaleString()}</strong>
        </div>

        <div className="option-group">
          <h3>Paint</h3>
          <div className="color-options">
            {COLOR_OPTIONS.map((color) => (
              <button
                type="button"
                key={color.id}
                className={`color-swatch ${selectedColor.id === color.id ? 'selected' : ''}`}
                onClick={() => setSelectedColor(color)}
                aria-label={`${color.name}, $${color.price.toLocaleString()} additional`}
                aria-pressed={selectedColor.id === color.id}
              >
                <span style={{ backgroundColor: color.hex }} />
              </button>
            ))}
          </div>
          <p>{selectedColor.name} {selectedColor.price ? `(+$${selectedColor.price.toLocaleString()})` : '(included)'}</p>
        </div>

        <label className="toggle-row">
          <span>
            <strong>Full Self-Driving Capability</strong>
            <small>+${FSD_PRICE.toLocaleString()}</small>
          </span>
          <input type="checkbox" checked={hasFSD} onChange={(event) => setHasFSD(event.target.checked)} />
        </label>

        <div className="order-form">
          <label htmlFor="order-email">Email address</label>
          <input
            id="order-email"
            type="email"
            autoComplete="email"
            placeholder="you@example.com"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
          />
          <button type="button" className="primary-button" onClick={handleOrderSubmit} disabled={submitting}>
            {submitting ? 'Creating order…' : 'Order Now'}
          </button>
          {message && <p className="success-message">{message}</p>}
          {error && <p className="error-message">{error}</p>}
        </div>
      </div>
    </section>
  );
}
