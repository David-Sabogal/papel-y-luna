import { useRef } from 'react';
import './Factura.css';

const formatCOP = (v) =>
  new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', minimumFractionDigits: 0 }).format(v || 0);

const INFO_NEGOCIO = {
  nombre: 'FT Vanguard Group',
  ein: '12-3456789',
  direccion: 'California, USA',
  telefono: '+1 (555) 000-0000',
};

export default function Factura({ venta, onClose }) {
  const printRef = useRef(null);

  const imprimir = () => {
    const contenido = printRef.current.innerHTML;
    const ventana = window.open('', '_blank');
    ventana.document.write(`
      <html><head><title>Factura #${venta.id}</title>
      <style>
        body { font-family: monospace; font-size: 12px; max-width: 320px; margin: 0 auto; padding: 10px; }
        .linea { border-top: 1px dashed #000; margin: 6px 0; }
        .fila { display: flex; justify-content: space-between; }
        .centro { text-align: center; }
        .negrita { font-weight: bold; }
        table { width: 100%; border-collapse: collapse; }
        td, th { padding: 3px 0; font-size: 11px; }
      </style></head>
      <body>${contenido}</body></html>
    `);
    ventana.document.close();
    ventana.print();
  };

  return (
    <div className="factura-overlay">
      <div className="factura-box">
        <div className="factura-actions">
          <button className="btn btn-primary" onClick={imprimir}>🖨️ Imprimir</button>
          <button className="btn btn-secondary" onClick={onClose}>✕ Cerrar</button>
        </div>

        <div ref={printRef} className="factura-contenido">
          <div className="centro">
            <p className="negrita" style={{ fontSize: '1.1rem' }}>{INFO_NEGOCIO.nombre}</p>
            <p>EIN: {INFO_NEGOCIO.ein}</p>
            <p>{INFO_NEGOCIO.direccion}</p>
            <p>Tel: {INFO_NEGOCIO.telefono}</p>
          </div>

          <div className="linea" />

          <div className="fila"><span>Factura #:</span><span><strong>{venta.id}</strong></span></div>
          <div className="fila">
            <span>Fecha:</span>
            <span>{new Date(venta.createdAt).toLocaleString('es-CO')}</span>
          </div>
          {venta.Cliente && (
            <div className="fila"><span>Cliente:</span><span>{venta.Cliente.nombre}</span></div>
          )}
          {venta.Usuario && (
            <div className="fila"><span>Cajero:</span><span>{venta.Usuario.username}</span></div>
          )}

          <div className="linea" />

          <table>
            <thead>
              <tr>
                <th style={{ textAlign: 'left' }}>Producto</th>
                <th>Cant</th>
                <th style={{ textAlign: 'right' }}>Subtotal</th>
              </tr>
            </thead>
            <tbody>
              {venta.items?.map(item => (
                <tr key={item.id}>
                  <td>{item.Producto?.nombre || '?'}</td>
                  <td style={{ textAlign: 'center' }}>x{item.quantity}</td>
                  <td style={{ textAlign: 'right' }}>{formatCOP(item.subtotal)}</td>
                </tr>
              ))}
            </tbody>
          </table>

          <div className="linea" />

          <div className="fila"><span>Subtotal:</span><span>{formatCOP(venta.subtotal)}</span></div>
          {venta.descuentoValor > 0 && (
            <div className="fila"><span>Descuento:</span><span>− {formatCOP(venta.descuentoValor)}</span></div>
          )}
          <div className="fila negrita" style={{ fontSize: '1.05rem' }}>
            <span>TOTAL:</span><span>{formatCOP(venta.total)}</span>
          </div>

          <div className="linea" />

          <div className="fila"><span>Método de pago:</span><span>{venta.metodoPago}</span></div>
          
          {/* Lógica de Efectivo / Cash previa */}
          {venta.metodoPago === 'Efectivo' && (
            <>
              <div className="fila"><span>Recibido:</span><span>{formatCOP(venta.valorRecibido)}</span></div>
              <div className="fila"><span>Cambio:</span><span>{formatCOP(venta.cambio)}</span></div>
            </>
          )}

          {/* Nueva lógica de Permuta integrada */}
          {venta.metodoPago === 'Permuta' && (
            <div style={{ fontSize: '.84rem', color: '#555', width: '100%' }}>
              <div className="fila"><span>Trade-in vehicle:</span><span>{formatCOP(venta.permuteCarValue)}</span></div>
              {venta.permuteCarValue < venta.total && (
                <div className="fila">
                  <span>Remainder ({venta.permuteExtraMethod}):</span>
                  <span>{formatCOP(venta.total - venta.permuteCarValue)}</span>
                </div>
              )}
            </div>
          )}

          {venta.saldoDebe > 0 && (
            <div className="fila" style={{ color: '#e03a3a' }}>
              <span>Saldo pendiente:</span><span><strong>{formatCOP(venta.saldoDebe)}</strong></span>
            </div>
          )}

          {venta.fueCOrregida && (
            <>
              <div className="linea" />
              <p style={{ fontSize: '0.78rem', color: '#888', textAlign: 'center' }}>
                ✏️ Venta corregida
              </p>
            </>
          )}

          <div className="linea" />
          <p className="centro" style={{ fontSize: '0.82rem', color: '#888' }}>
            ¡Gracias por tu compra!
          </p>
        </div>
      </div>
    </div>
  );
}