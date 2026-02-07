"use client";

import { useState, useEffect } from "react";

/**
 * ShotTypeModal - Modal para seleção de tipo de tiro (cosmético apenas)
 * 
 * @param {boolean} open - Se o modal está aberto
 * @param {function} onClose - Callback ao fechar
 * @param {number} shipIndex - Índice da nave (1, 2 ou 3)
 * @param {string} currentShotType - Tipo atual selecionado
 * @param {function} onConfirm - Callback ao confirmar (shotType) => void
 */
export default function ShotTypeModal({ open, onClose, shipIndex, currentShotType, onConfirm }) {
  const [selectedType, setSelectedType] = useState(currentShotType || "plasma");

  useEffect(() => {
    if (open) {
      setSelectedType(currentShotType || "plasma");
    }
  }, [open, currentShotType]);

  if (!open) return null;

  // Definição dos tipos de tiro (futuramente vindo de config/API)
  const shotTypes = [
    {
      id: "plasma",
      name: "Plasma Clássico",
      description: "Projétil clássico de energia azul.",
      thumbnail: "/game/images/shots/plasma.png",
      unlocked: true
    },
    {
      id: "pulse",
      name: "Pulse Energy",
      description: "Projétil energético pulsante roxo.",
      thumbnail: "/game/images/shots/pulse.png",
      unlocked: false,
      unlockHint: "Desbloqueie com VIP"
    },
    {
      id: "energy",
      name: "Ion Spark",
      description: "Projétil de íons elétricos amarelo.",
      thumbnail: "/game/images/shots/energy.png",
      unlocked: false,
      unlockHint: "Desbloqueie no Rank 10"
    }
  ];

  const handleConfirm = () => {
    onConfirm(selectedType);
    onClose();
  };

  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        background: 'rgba(0,0,0,0.92)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 9999,
        padding: '20px',
        animation: 'fadeIn 0.2s ease'
      }}
    >
      <style>{`
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes slideUp {
          from { 
            transform: translateY(30px);
            opacity: 0;
          }
          to { 
            transform: translateY(0);
            opacity: 1;
          }
        }
        @keyframes glow {
          0%, 100% { box-shadow: 0 0 20px rgba(0,229,255,0.4); }
          50% { box-shadow: 0 0 30px rgba(0,229,255,0.6); }
        }
      `}</style>

      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          background: 'linear-gradient(135deg, rgba(0,15,30,0.98) 0%, rgba(0,5,15,0.98) 100%)',
          border: '2px solid rgba(0,229,255,0.5)',
          borderRadius: 20,
          padding: '40px',
          maxWidth: 1100,
          width: '100%',
          animation: 'slideUp 0.3s ease',
          position: 'relative',
          boxShadow: '0 0 40px rgba(0,229,255,0.3)'
        }}
      >
        {/* Header */}
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: 32
        }}>
          <h2 style={{
            fontSize: 32,
            fontWeight: 700,
            color: '#00E5FF',
            margin: 0,
            fontFamily: "'Orbitron', sans-serif",
            textShadow: '0 0 20px rgba(0,229,255,0.6)',
            letterSpacing: 2
          }}>
            Tipo de Tiro
          </h2>

          <button
            onClick={onClose}
            style={{
              background: 'transparent',
              border: '2px solid rgba(0,229,255,0.4)',
              borderRadius: 10,
              width: 48,
              height: 48,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              transition: 'all 0.2s',
              color: '#00E5FF'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = 'rgba(0,229,255,0.1)';
              e.currentTarget.style.borderColor = '#00E5FF';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = 'transparent';
              e.currentTarget.style.borderColor = 'rgba(0,229,255,0.4)';
            }}
          >
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
              <path d="M18 6L6 18M6 6l12 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
            </svg>
          </button>
        </div>

        {/* Ship indicator */}
        <div style={{
          fontSize: 14,
          color: 'rgba(255,255,255,0.6)',
          marginBottom: 24,
          fontFamily: "'Orbitron', sans-serif"
        }}>
          Nave {shipIndex} / 3
        </div>

        {/* Cards Grid */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
          gap: 24,
          marginBottom: 32
        }}>
          {shotTypes.map(type => {
            const isSelected = selectedType === type.id;
            const canSelect = type.unlocked;

            return (
              <div
                key={type.id}
                onClick={() => canSelect && setSelectedType(type.id)}
                style={{
                  background: isSelected 
                    ? 'linear-gradient(135deg, rgba(0,229,255,0.15) 0%, rgba(0,114,255,0.15) 100%)'
                    : 'rgba(0,20,40,0.6)',
                  border: isSelected 
                    ? '2px solid rgba(0,229,255,0.8)' 
                    : canSelect 
                      ? '2px solid rgba(0,229,255,0.3)'
                      : '2px solid rgba(100,100,100,0.3)',
                  borderRadius: 16,
                  padding: 20,
                  cursor: canSelect ? 'pointer' : 'not-allowed',
                  transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                  transform: isSelected ? 'translateY(-4px) scale(1.02)' : 'translateY(0)',
                  boxShadow: isSelected 
                    ? '0 8px 32px rgba(0,229,255,0.4)' 
                    : '0 2px 8px rgba(0,0,0,0.3)',
                  opacity: canSelect ? 1 : 0.5,
                  position: 'relative',
                  overflow: 'hidden'
                }}
                onMouseEnter={(e) => {
                  if (canSelect && !isSelected) {
                    e.currentTarget.style.transform = 'translateY(-2px)';
                    e.currentTarget.style.borderColor = 'rgba(0,229,255,0.6)';
                  }
                }}
                onMouseLeave={(e) => {
                  if (!isSelected) {
                    e.currentTarget.style.transform = 'translateY(0)';
                    e.currentTarget.style.borderColor = canSelect 
                      ? 'rgba(0,229,255,0.3)' 
                      : 'rgba(100,100,100,0.3)';
                  }
                }}
              >
                {/* Check icon or Lock icon */}
                <div style={{
                  position: 'absolute',
                  top: 16,
                  right: 16,
                  width: 40,
                  height: 40,
                  borderRadius: '50%',
                  background: isSelected 
                    ? 'rgba(0,229,255,0.2)' 
                    : !canSelect 
                      ? 'rgba(100,100,100,0.2)'
                      : 'transparent',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  border: isSelected 
                    ? '2px solid #00E5FF' 
                    : !canSelect 
                      ? '2px solid #666'
                      : 'none'
                }}>
                  {isSelected ? (
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                      <path d="M5 13l4 4L19 7" stroke="#00E5FF" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                  ) : !canSelect ? (
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                      <rect x="5" y="11" width="14" height="10" rx="2" stroke="#666" strokeWidth="2"/>
                      <path d="M8 11V7a4 4 0 118 0v4" stroke="#666" strokeWidth="2" strokeLinecap="round"/>
                    </svg>
                  ) : null}
                </div>

                {/* Thumbnail */}
                <div style={{
                  width: '100%',
                  height: 180,
                  borderRadius: 12,
                  background: 'rgba(0,0,0,0.4)',
                  marginBottom: 16,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  overflow: 'hidden',
                  border: '1px solid rgba(0,229,255,0.2)'
                }}>
                  <img 
                    src={type.thumbnail} 
                    alt={type.name}
                    style={{
                      maxWidth: '80%',
                      maxHeight: '80%',
                      objectFit: 'contain',
                      filter: !canSelect ? 'grayscale(1) brightness(0.5)' : 'none'
                    }}
                  />
                </div>

                {/* Name */}
                <div style={{
                  fontSize: 18,
                  fontWeight: 700,
                  color: isSelected ? '#00E5FF' : canSelect ? '#FFF' : '#888',
                  marginBottom: 8,
                  fontFamily: "'Orbitron', sans-serif"
                }}>
                  {type.name}
                </div>

                {/* Description */}
                <div style={{
                  fontSize: 13,
                  color: 'rgba(255,255,255,0.7)',
                  lineHeight: 1.5,
                  marginBottom: 12
                }}>
                  {type.description}
                </div>

                {/* Status badge */}
                {isSelected && (
                  <div style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 6,
                    padding: '6px 12px',
                    background: 'rgba(0,229,255,0.15)',
                    border: '1px solid rgba(0,229,255,0.4)',
                    borderRadius: 20,
                    fontSize: 12,
                    fontWeight: 700,
                    color: '#00E5FF',
                    fontFamily: "'Orbitron', sans-serif"
                  }}>
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none">
                      <path d="M5 13l4 4L19 7" stroke="#00E5FF" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                    ATIVO
                  </div>
                )}

                {!canSelect && type.unlockHint && (
                  <div style={{
                    fontSize: 11,
                    color: '#888',
                    fontStyle: 'italic'
                  }}>
                    {type.unlockHint}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Confirm button */}
        <button
          onClick={handleConfirm}
          style={{
            width: '100%',
            padding: '16px 32px',
            background: 'linear-gradient(90deg, #00E5FF, #0072FF)',
            color: '#001018',
            border: 'none',
            borderRadius: 12,
            fontSize: 18,
            fontWeight: 700,
            fontFamily: "'Orbitron', sans-serif",
            cursor: 'pointer',
            transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
            transform: 'translateY(0)',
            boxShadow: '0 4px 20px rgba(0,229,255,0.4)',
            letterSpacing: 2
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.transform = 'translateY(-2px)';
            e.currentTarget.style.boxShadow = '0 6px 30px rgba(0,229,255,0.6)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.transform = 'translateY(0)';
            e.currentTarget.style.boxShadow = '0 4px 20px rgba(0,229,255,0.4)';
          }}
        >
          CONFIRMAR
        </button>
      </div>
    </div>
  );
}
