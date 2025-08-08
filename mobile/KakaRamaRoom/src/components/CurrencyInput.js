import React, { useState, useEffect } from 'react';
import { TextInput, View, Text, StyleSheet } from 'react-native';
import { COLORS, SIZES } from '../config/constants';

const CurrencyInput = ({ 
  value, 
  onChangeValue, 
  placeholder = "Masukkan nominal",
  style,
  label,
  suffix = "000",
  prefix = "Rp ",
  editable = true,
  ...props 
}) => {
  const [displayValue, setDisplayValue] = useState('');
  const [inputValue, setInputValue] = useState('');

  useEffect(() => {
    if (value) {
      // Convert value to display format
      const numericValue = parseFloat(value);
      if (!isNaN(numericValue)) {
        // Remove the last 3 digits (000) for display
        const displayNum = Math.floor(numericValue / 1000);
        setInputValue(displayNum.toString());
        setDisplayValue(formatCurrency(numericValue));
      }
    } else {
      setInputValue('');
      setDisplayValue('');
    }
  }, [value]);

  const formatCurrency = (amount) => {
    if (amount === 0) return '0';
    if (!amount) return '';
    return amount.toLocaleString('id-ID');
  };

  const handleInputChange = (text) => {
    // Remove non-numeric characters
    const numericText = text.replace(/[^0-9]/g, '');

    if (numericText === '') {
      setInputValue('');
      setDisplayValue('');
      onChangeValue('');
      return;
    }

    // Convert to number
    const inputNumber = parseInt(numericText);

    // Special case for 0 - don't add suffix
    if (inputNumber === 0) {
      setInputValue('0');
      setDisplayValue(formatCurrency(0));
      onChangeValue('0');
      return;
    }

    // Add 000 suffix for non-zero values
    const actualValue = inputNumber * 1000;

    setInputValue(numericText);
    setDisplayValue(formatCurrency(actualValue));
    onChangeValue(actualValue.toString());
  };

  const getPlaceholderWithSuffix = () => {
    if (!placeholder) return '';
    return `${placeholder} (dalam ribuan)`;
  };

  return (
    <View style={styles.container}>
      {label && <Text style={styles.label}>{label}</Text>}
      
      <View style={[styles.inputContainer, style]}>
        {prefix && (
          <Text style={styles.prefix}>{prefix}</Text>
        )}
        
        <TextInput
          style={styles.input}
          value={inputValue}
          onChangeText={handleInputChange}
          placeholder={getPlaceholderWithSuffix()}
          placeholderTextColor={COLORS.gray400}
          keyboardType="numeric"
          editable={editable}
          {...props}
        />
        
        {suffix && inputValue && (
          <Text style={styles.suffix}>{suffix}</Text>
        )}
      </View>
      
      {displayValue && (
        <Text style={styles.displayValue}>
          = {prefix}{displayValue}
        </Text>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginBottom: SIZES.sm,
  },
  label: {
    fontSize: SIZES.body,
    fontWeight: '600',
    color: COLORS.textPrimary,
    marginBottom: SIZES.sm,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.gray300,
    borderRadius: SIZES.radius,
    backgroundColor: COLORS.background,
    paddingHorizontal: SIZES.md,
    minHeight: 48,
  },
  prefix: {
    fontSize: SIZES.body,
    color: COLORS.textSecondary,
    marginRight: SIZES.xs,
  },
  input: {
    flex: 1,
    fontSize: SIZES.body,
    color: COLORS.textPrimary,
    paddingVertical: SIZES.sm,
  },
  suffix: {
    fontSize: SIZES.body,
    color: COLORS.textSecondary,
    marginLeft: SIZES.xs,
    fontWeight: '600',
  },
  displayValue: {
    fontSize: SIZES.caption,
    color: COLORS.primary,
    marginTop: SIZES.xs,
    fontWeight: '500',
  },
});

export default CurrencyInput;
