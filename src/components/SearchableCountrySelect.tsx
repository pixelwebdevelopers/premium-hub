'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Search, ChevronDown, Check } from 'lucide-react';
import { COUNTRIES } from '../lib/countries';
import { fuzzySearchFilter } from '../lib/fuzzySearch';

interface SearchableCountrySelectProps {
  value: string; // country code
  onChange: (value: string) => void;
  disabled?: boolean;
  placeholder?: string;
}

export default function SearchableCountrySelect({
  value,
  onChange,
  disabled = false,
  placeholder = 'Select Country...',
}: SearchableCountrySelectProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState('');
  const containerRef = useRef<HTMLDivElement>(null);

  const selectedCountry = COUNTRIES.find((c) => c.code === value);

  // Filter countries based on fuzzy search
  const filteredCountries = fuzzySearchFilter(
    COUNTRIES,
    search,
    (c) => [c.name, c.code, c.currency]
  );

  // Close when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div
      ref={containerRef}
      style={{
        position: 'relative',
        width: '100%',
      }}
    >
      {/* Trigger Button */}
      <button
        type="button"
        onClick={() => !disabled && setIsOpen(!isOpen)}
        disabled={disabled}
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          width: '100%',
          height: '42px',
          background: 'var(--bg-tertiary)',
          border: '1px solid var(--border-light)',
          borderRadius: 'var(--border-radius-sm)',
          padding: '0 14px',
          fontSize: '14.5px',
          color: selectedCountry ? 'var(--text-primary)' : 'var(--text-secondary)',
          cursor: disabled ? 'not-allowed' : 'pointer',
          textAlign: 'left',
          transition: 'var(--transition-smooth)',
          outline: 'none',
        }}
        onFocus={(e) => {
          if (!disabled) {
            e.currentTarget.style.borderColor = 'var(--accent-purple)';
            e.currentTarget.style.boxShadow = '0 0 0 3px rgba(139, 92, 246, 0.12)';
            e.currentTarget.style.background = 'var(--bg-secondary)';
          }
        }}
        onBlur={(e) => {
          e.currentTarget.style.borderColor = 'var(--border-light)';
          e.currentTarget.style.boxShadow = 'none';
          e.currentTarget.style.background = 'var(--bg-tertiary)';
        }}
      >
        <span>
          {selectedCountry
            ? `${selectedCountry.name} (${selectedCountry.code}) — ${selectedCountry.currency}`
            : placeholder}
        </span>
        <ChevronDown
          size={16}
          style={{
            color: 'var(--text-secondary)',
            transform: isOpen ? 'rotate(180deg)' : 'none',
            transition: 'transform 0.2s',
          }}
        />
      </button>

      {/* Floating Dropdown Panel */}
      {isOpen && (
        <div
          style={{
            position: 'absolute',
            top: '46px',
            left: 0,
            right: 0,
            background: 'var(--bg-secondary)',
            border: '1px solid var(--border-medium)',
            borderRadius: 'var(--border-radius-md)',
            boxShadow: 'var(--shadow-premium)',
            zIndex: 1000,
            overflow: 'hidden',
            display: 'flex',
            flexDirection: 'column',
            maxHeight: '280px',
          }}
        >
          {/* Search Input inside Dropdown */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              padding: '8px 12px',
              borderBottom: '1px solid var(--border-light)',
              background: 'var(--bg-tertiary)',
              gap: '8px',
            }}
          >
            <Search size={16} style={{ color: 'var(--text-muted)' }} />
            <input
              type="text"
              placeholder="Search by country or currency..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              style={{
                flex: 1,
                border: 'none',
                background: 'transparent',
                outline: 'none',
                fontSize: '13.5px',
                color: 'var(--text-primary)',
              }}
              autoFocus
            />
          </div>

          {/* List Options */}
          <div
            style={{
              overflowY: 'auto',
              flex: 1,
            }}
          >
            {filteredCountries.length === 0 ? (
              <div
                style={{
                  padding: '12px',
                  fontSize: '13px',
                  color: 'var(--text-secondary)',
                  textAlign: 'center',
                }}
              >
                No countries found
              </div>
            ) : (
              filteredCountries.map((c) => {
                const isSelected = c.code === value;
                return (
                  <button
                    key={c.code}
                    type="button"
                    onClick={() => {
                      onChange(c.code);
                      setIsOpen(false);
                      setSearch('');
                    }}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      width: '100%',
                      padding: '10px 14px',
                      background: isSelected ? 'var(--accent-purple-glow)' : 'transparent',
                      border: 'none',
                      borderBottom: '1px solid var(--border-light)',
                      textAlign: 'left',
                      fontSize: '13.5px',
                      color: isSelected ? 'var(--accent-purple)' : 'var(--text-primary)',
                      cursor: 'pointer',
                      transition: 'background 0.2s',
                    }}
                    onMouseEnter={(e) => {
                      if (!isSelected) e.currentTarget.style.background = 'var(--bg-tertiary)';
                    }}
                    onMouseLeave={(e) => {
                      if (!isSelected) e.currentTarget.style.background = 'transparent';
                    }}
                  >
                    <span>
                      {c.name} ({c.code}) — <strong style={{ fontFamily: 'monospace' }}>{c.currency}</strong>
                    </span>
                    {isSelected && <Check size={14} style={{ color: 'var(--accent-purple)' }} />}
                  </button>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
}
