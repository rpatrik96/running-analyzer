/**
 * Script to analyze FIT file fields and test parsing
 */
import { readFileSync } from 'fs';

// Simplified FIT parser for testing
const FIT_SIGNATURE = '.FIT';

interface FieldDef {
  fieldDefNum: number;
  fieldSize: number;
  baseType: number;
}

interface MessageDef {
  globalMessageNumber: number;
  fields: FieldDef[];
  devFields: { fieldNum: number; size: number; devDataIndex: number }[];
  size: number;
  isLittleEndian: boolean;
}

// Known field names
const RECORD_FIELDS: Record<number, string> = {
  253: 'timestamp',
  0: 'position_lat',
  1: 'position_long',
  2: 'altitude',
  3: 'heart_rate',
  4: 'cadence',
  5: 'distance',
  6: 'speed',
  7: 'power',
  39: 'vertical_oscillation',
  40: 'stance_time_percent',
  41: 'stance_time',
  47: 'vertical_ratio',
  48: 'stance_time_balance',
  49: 'step_length',
  53: 'fractional_cadence',
  62: 'enhanced_altitude',
  73: 'enhanced_speed',
};

function parseField(view: DataView, offset: number, field: FieldDef, isLE: boolean): number | null {
  try {
    const baseType = field.baseType & 0x1F;
    switch (baseType) {
      case 0: case 2: case 10: return view.getUint8(offset);
      case 1: return view.getInt8(offset);
      case 3: case 131: return field.fieldSize >= 2 ? view.getInt16(offset, isLE) : null;
      case 4: case 132: return field.fieldSize >= 2 ? view.getUint16(offset, isLE) : null;
      case 5: case 133: return field.fieldSize >= 4 ? view.getInt32(offset, isLE) : null;
      case 6: case 134: return field.fieldSize >= 4 ? view.getUint32(offset, isLE) : null;
      case 8: case 136: return field.fieldSize >= 4 ? view.getFloat32(offset, isLE) : null;
      case 11: return field.fieldSize >= 2 ? view.getUint16(offset, isLE) : null;
      case 12: return field.fieldSize >= 4 ? view.getUint32(offset, isLE) : null;
      default: return null;
    }
  } catch { return null; }
}

function analyzeFIT(filePath: string) {
  const buffer = readFileSync(filePath);
  const view = new DataView(buffer.buffer, buffer.byteOffset, buffer.byteLength);

  const headerSize = view.getUint8(0);
  const dataSize = view.getUint32(4, true);
  const signature = String.fromCharCode(view.getUint8(8), view.getUint8(9), view.getUint8(10), view.getUint8(11));

  if (signature !== FIT_SIGNATURE) {
    console.error('Invalid FIT signature!');
    return;
  }

  let offset = headerSize;
  const endOffset = headerSize + dataSize;
  const definitions = new Map<number, MessageDef>();

  // Collect stats on all fields
  const fieldStats: Record<string, { count: number; min: number; max: number; samples: number[] }> = {};
  let recordCount = 0;

  while (offset < endOffset && offset < view.byteLength - 1) {
    const recordHeader = view.getUint8(offset);
    offset++;

    const isCompressed = (recordHeader & 0x80) !== 0;
    const isDefinition = (recordHeader & 0x40) !== 0;
    const hasDev = (recordHeader & 0x20) !== 0;
    const localType = isCompressed ? ((recordHeader >> 5) & 0x03) : (recordHeader & 0x0F);

    if (isCompressed) {
      const def = definitions.get(localType);
      if (def && def.globalMessageNumber === 20) {
        // Parse compressed timestamp record
        let fieldOffset = offset;
        for (const field of def.fields) {
          const name = RECORD_FIELDS[field.fieldDefNum] || `field_${field.fieldDefNum}`;
          const value = parseField(view, fieldOffset, field, def.isLittleEndian);

          if (value !== null && value !== 0xFFFF && value !== 0xFFFFFFFF && value !== 0xFF && value !== 0x7FFFFFFF) {
            if (!fieldStats[name]) {
              fieldStats[name] = { count: 0, min: Infinity, max: -Infinity, samples: [] };
            }
            fieldStats[name].count++;
            fieldStats[name].min = Math.min(fieldStats[name].min, value);
            fieldStats[name].max = Math.max(fieldStats[name].max, value);
            if (fieldStats[name].samples.length < 5) {
              fieldStats[name].samples.push(value);
            }
          }
          fieldOffset += field.fieldSize;
        }
        // Dev fields
        for (const devField of def.devFields) {
          const name = `dev_${devField.devDataIndex}_${devField.fieldNum}`;
          let value: number | null = null;
          if (devField.size === 4) {
            value = view.getFloat32(fieldOffset, def.isLittleEndian);
            if (!Number.isFinite(value) || Math.abs(value) > 1e6) {
              value = view.getUint32(fieldOffset, def.isLittleEndian);
            }
          } else if (devField.size === 2) {
            value = view.getUint16(fieldOffset, def.isLittleEndian);
          }
          if (value !== null && value !== 0) {
            if (!fieldStats[name]) {
              fieldStats[name] = { count: 0, min: Infinity, max: -Infinity, samples: [] };
            }
            fieldStats[name].count++;
            fieldStats[name].min = Math.min(fieldStats[name].min, value);
            fieldStats[name].max = Math.max(fieldStats[name].max, value);
            if (fieldStats[name].samples.length < 5) {
              fieldStats[name].samples.push(value);
            }
          }
          fieldOffset += devField.size;
        }
        recordCount++;
      }
      const def2 = definitions.get(localType);
      if (def2) offset += def2.size;
      continue;
    }

    if (isDefinition) {
      offset++; // reserved
      const arch = view.getUint8(offset++);
      const isLittleEndian = arch === 0;
      const globalMsgNum = view.getUint16(offset, isLittleEndian);
      offset += 2;
      const numFields = view.getUint8(offset++);

      const fields: FieldDef[] = [];
      let msgSize = 0;
      for (let i = 0; i < numFields; i++) {
        const fieldDefNum = view.getUint8(offset++);
        const fieldSize = view.getUint8(offset++);
        const baseType = view.getUint8(offset++);
        fields.push({ fieldDefNum, fieldSize, baseType });
        msgSize += fieldSize;
      }

      const devFields: { fieldNum: number; size: number; devDataIndex: number }[] = [];
      if (hasDev) {
        const numDev = view.getUint8(offset++);
        for (let i = 0; i < numDev; i++) {
          const fieldNum = view.getUint8(offset++);
          const size = view.getUint8(offset++);
          const devDataIndex = view.getUint8(offset++);
          devFields.push({ fieldNum, size, devDataIndex });
          msgSize += size;
        }
      }

      definitions.set(localType, { globalMessageNumber: globalMsgNum, fields, devFields, size: msgSize, isLittleEndian });
    } else {
      const def = definitions.get(localType);
      if (!def) continue;

      if (def.globalMessageNumber === 20) {
        let fieldOffset = offset;
        for (const field of def.fields) {
          const name = RECORD_FIELDS[field.fieldDefNum] || `field_${field.fieldDefNum}`;
          const value = parseField(view, fieldOffset, field, def.isLittleEndian);

          if (value !== null && value !== 0xFFFF && value !== 0xFFFFFFFF && value !== 0xFF && value !== 0x7FFFFFFF) {
            if (!fieldStats[name]) {
              fieldStats[name] = { count: 0, min: Infinity, max: -Infinity, samples: [] };
            }
            fieldStats[name].count++;
            fieldStats[name].min = Math.min(fieldStats[name].min, value);
            fieldStats[name].max = Math.max(fieldStats[name].max, value);
            if (fieldStats[name].samples.length < 5) {
              fieldStats[name].samples.push(value);
            }
          }
          fieldOffset += field.fieldSize;
        }
        // Dev fields
        for (const devField of def.devFields) {
          const name = `dev_${devField.devDataIndex}_${devField.fieldNum}`;
          let value: number | null = null;
          if (devField.size === 4) {
            value = view.getFloat32(fieldOffset, def.isLittleEndian);
            if (!Number.isFinite(value) || Math.abs(value) > 1e6) {
              value = view.getUint32(fieldOffset, def.isLittleEndian);
            }
          } else if (devField.size === 2) {
            value = view.getUint16(fieldOffset, def.isLittleEndian);
          }
          if (value !== null && value !== 0) {
            if (!fieldStats[name]) {
              fieldStats[name] = { count: 0, min: Infinity, max: -Infinity, samples: [] };
            }
            fieldStats[name].count++;
            fieldStats[name].min = Math.min(fieldStats[name].min, value);
            fieldStats[name].max = Math.max(fieldStats[name].max, value);
            if (fieldStats[name].samples.length < 5) {
              fieldStats[name].samples.push(value);
            }
          }
          fieldOffset += devField.size;
        }
        recordCount++;
      }

      offset += def.size;
    }
  }

  console.log(`\n=== FIT File Analysis: ${filePath} ===`);
  console.log(`Total record messages: ${recordCount}\n`);

  console.log('Field Statistics (raw values):');
  console.log('=' .repeat(80));

  const sortedFields = Object.entries(fieldStats).sort((a, b) => b[1].count - a[1].count);

  for (const [name, stats] of sortedFields) {
    if (stats.count > 0) {
      console.log(`\n${name}:`);
      console.log(`  Count: ${stats.count}`);
      console.log(`  Range: ${stats.min} - ${stats.max}`);
      console.log(`  Samples: ${stats.samples.join(', ')}`);

      // Suggest scaling based on known fields
      if (name === 'distance') {
        console.log(`  -> Scaled (÷100÷1000): ${(stats.samples[0]/100/1000).toFixed(4)} km`);
      } else if (name === 'enhanced_speed' || name === 'speed') {
        console.log(`  -> Scaled (÷1000): ${(stats.samples[0]/1000).toFixed(3)} m/s`);
      } else if (name === 'stance_time') {
        console.log(`  -> Scaled (÷10): ${(stats.samples[0]/10).toFixed(1)} ms`);
      } else if (name === 'vertical_oscillation') {
        console.log(`  -> Scaled (÷100): ${(stats.samples[0]/100).toFixed(2)} mm = ${(stats.samples[0]/100/10).toFixed(3)} cm`);
      } else if (name === 'step_length') {
        console.log(`  -> Scaled (÷10): ${(stats.samples[0]/10).toFixed(1)} mm`);
      } else if (name === 'vertical_ratio' || name === 'stance_time_balance' || name === 'stance_time_percent') {
        console.log(`  -> Scaled (÷100): ${(stats.samples[0]/100).toFixed(2)} %`);
      }
    }
  }
}

// Run
const filePath = process.argv[2] || '/Users/patrik.reizinger/Downloads/21273763192_ACTIVITY.fit';
analyzeFIT(filePath);
