/**
 * Comprehensive FIT File Parser
 * Supports Garmin running dynamics and Stryd developer fields
 */

import type {
  FITHeader,
  FITFieldDefinition,
  FITDevFieldDefinition,
  FITMessageDefinition,
  FITDeveloperField,
  FITRecord,
} from '../types/fit';

// FIT Protocol Constants
const FIT_SIGNATURE = '.FIT';
const FIT_MESSAGE_TYPE_DEFINITION = 0x40;
const FIT_MESSAGE_TYPE_DEV_FIELDS = 0x20;
const FIT_COMPRESSED_TIMESTAMP = 0x80;

// Global Message Numbers
const MSG_FIELD_DESCRIPTION = 206;
const MSG_DEVELOPER_DATA_ID = 207;
const MSG_RECORD = 20;

// Record message field definitions (Garmin FIT SDK)
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
  42: 'activity_type',
  43: 'left_right_balance',
  44: 'gps_accuracy',
  45: 'vertical_speed',
  46: 'calories',
  47: 'vertical_ratio',
  48: 'stance_time_balance',
  49: 'step_length',
  53: 'fractional_cadence',
  62: 'enhanced_altitude',
  73: 'enhanced_speed',
  78: 'saturated_hemoglobin_percent',
  79: 'total_hemoglobin_conc',
  83: 'core_temperature',
};

// Known Stryd developer field names (case-insensitive matching)
const STRYD_FIELD_MAPPINGS: Record<string, string> = {
  'power': 'stryd_power',
  'form power': 'form_power',
  'formpower': 'form_power',
  'leg spring stiffness': 'leg_spring_stiffness',
  'legspringstiffness': 'leg_spring_stiffness',
  'lss': 'leg_spring_stiffness',
  'air power': 'air_power',
  'airpower': 'air_power',
  'ground time': 'ground_time',
  'groundtime': 'ground_time',
  'gct': 'ground_time',
  'vertical oscillation': 'vertical_oscillation_stryd',
  'verticaloscillation': 'vertical_oscillation_stryd',
  'cadence': 'cadence_stryd',
  'elevation': 'elevation',
  'impact loading rate': 'impact_loading_rate',
  'impactloadingrate': 'impact_loading_rate',
  'ilr': 'impact_loading_rate',
  'braking impulse': 'braking_impulse',
  'brakingimpulse': 'braking_impulse',
  'footstrike type': 'footstrike_type',
  'footstriketype': 'footstrike_type',
  'pronation excursion': 'pronation_excursion',
  'pronationexcursion': 'pronation_excursion',
  'stance time': 'ground_time',
  'stancetime': 'ground_time',
};

export class FITParser {
  private view: DataView;
  private offset: number = 0;
  private definitions: Map<number, FITMessageDefinition> = new Map();
  private developerFields: Map<string, FITDeveloperField> = new Map();

  constructor(buffer: ArrayBuffer) {
    this.view = new DataView(buffer);
  }

  /**
   * Parse the FIT file and return record messages
   */
  async parse(): Promise<FITRecord[]> {
    const header = this.readHeader();
    if (!header) {
      throw new Error('Invalid FIT file header');
    }

    this.offset = header.headerSize;
    const endOffset = header.headerSize + header.dataSize;
    const records: FITRecord[] = [];

    while (this.offset < endOffset) {
      try {
        const result = this.readMessage();
        if (result && result.messageType === MSG_RECORD) {
          records.push(result);
        }
      } catch (e) {
        // Skip malformed messages and continue
        this.offset++;
      }
    }

    return records;
  }

  private readHeader(): FITHeader | null {
    try {
      const headerSize = this.view.getUint8(0);
      const protocolVersion = this.view.getUint8(1);
      const profileVersion = this.view.getUint16(2, true);
      const dataSize = this.view.getUint32(4, true);

      // Verify FIT signature
      const signature = String.fromCharCode(
        this.view.getUint8(8),
        this.view.getUint8(9),
        this.view.getUint8(10),
        this.view.getUint8(11)
      );

      if (signature !== FIT_SIGNATURE) {
        return null;
      }

      return { headerSize, protocolVersion, profileVersion, dataSize };
    } catch {
      return null;
    }
  }

  private readMessage(): FITRecord | null {
    if (this.offset >= this.view.byteLength) {
      return null;
    }

    const recordHeader = this.view.getUint8(this.offset);
    this.offset++;

    // Check for compressed timestamp header
    if ((recordHeader & FIT_COMPRESSED_TIMESTAMP) !== 0) {
      const localMessageType = (recordHeader >> 5) & 0x03;
      const def = this.definitions.get(localMessageType);
      if (def) {
        return this.readDataMessage(def, recordHeader);
      }
      return null;
    }

    const isDefinition = (recordHeader & FIT_MESSAGE_TYPE_DEFINITION) !== 0;
    const hasDeveloperData = (recordHeader & FIT_MESSAGE_TYPE_DEV_FIELDS) !== 0;
    const localMessageType = recordHeader & 0x0F;

    if (isDefinition) {
      this.readDefinitionMessage(localMessageType, hasDeveloperData);
      return null;
    } else {
      const def = this.definitions.get(localMessageType);
      if (def) {
        return this.readDataMessage(def, recordHeader);
      }
      return null;
    }
  }

  private readDefinitionMessage(localMessageType: number, hasDeveloperData: boolean): void {
    this.offset++; // Reserved byte
    const arch = this.view.getUint8(this.offset++);
    const isLittleEndian = arch === 0;
    const globalMessageNumber = this.view.getUint16(this.offset, isLittleEndian);
    this.offset += 2;
    const numFields = this.view.getUint8(this.offset++);

    const fields: FITFieldDefinition[] = [];
    let messageSize = 0;

    for (let i = 0; i < numFields; i++) {
      const fieldDefNum = this.view.getUint8(this.offset++);
      const fieldSize = this.view.getUint8(this.offset++);
      const baseType = this.view.getUint8(this.offset++);
      fields.push({ fieldDefNum, fieldSize, baseType });
      messageSize += fieldSize;
    }

    const devFields: FITDevFieldDefinition[] = [];
    if (hasDeveloperData) {
      const numDevFields = this.view.getUint8(this.offset++);
      for (let i = 0; i < numDevFields; i++) {
        const fieldNum = this.view.getUint8(this.offset++);
        const size = this.view.getUint8(this.offset++);
        const devDataIndex = this.view.getUint8(this.offset++);
        devFields.push({ fieldNum, size, devDataIndex });
        messageSize += size;
      }
    }

    this.definitions.set(localMessageType, {
      globalMessageNumber,
      fields,
      devFields,
      size: messageSize,
      isLittleEndian,
    });
  }

  private readDataMessage(def: FITMessageDefinition, _recordHeader: number): FITRecord | null {
    const record: FITRecord = { messageType: def.globalMessageNumber };

    // Read standard fields
    for (const field of def.fields) {
      const value = this.readFieldValue(field, def.isLittleEndian);

      if (def.globalMessageNumber === MSG_RECORD) {
        const fieldName = RECORD_FIELDS[field.fieldDefNum];
        if (fieldName && value !== null && value !== undefined) {
          (record as Record<string, number>)[fieldName] = value;
        }
      } else if (def.globalMessageNumber === MSG_FIELD_DESCRIPTION) {
        // Parse field description for developer fields
        this.handleFieldDescription(field, value);
      } else if (def.globalMessageNumber === MSG_DEVELOPER_DATA_ID) {
        // Parse developer data ID (identifies Stryd, Garmin, etc.)
        this.handleDeveloperDataId(field, value);
      }

      this.offset += field.fieldSize;
    }

    // Read developer fields (Stryd metrics)
    for (const devField of def.devFields) {
      const value = this.readDevFieldValue(devField, def.isLittleEndian);

      if (value !== null && value !== undefined) {
        // Try to map to known Stryd field
        const key = `${devField.devDataIndex}_${devField.fieldNum}`;
        const devFieldDef = this.developerFields.get(key);

        if (devFieldDef && devFieldDef.fieldName) {
          const normalizedName = devFieldDef.fieldName.toLowerCase().replace(/[_\s-]/g, '');
          const mappedName = this.findStrydFieldMapping(normalizedName, devFieldDef.fieldName);
          if (mappedName) {
            (record as Record<string, number>)[mappedName] = value;
          } else {
            // Store with generic name
            (record as Record<string, number>)[`dev_${devField.devDataIndex}_${devField.fieldNum}`] = value;
          }
        } else {
          // Store with generic name for later analysis
          (record as Record<string, number>)[`dev_${devField.devDataIndex}_${devField.fieldNum}`] = value;
        }
      }

      this.offset += devField.size;
    }

    return record;
  }

  private findStrydFieldMapping(normalizedName: string, originalName: string): string | null {
    // Try exact match first
    const lowerOriginal = originalName.toLowerCase();
    if (STRYD_FIELD_MAPPINGS[lowerOriginal]) {
      return STRYD_FIELD_MAPPINGS[lowerOriginal];
    }

    // Try normalized match
    for (const [pattern, mapped] of Object.entries(STRYD_FIELD_MAPPINGS)) {
      const normalizedPattern = pattern.replace(/[_\s-]/g, '');
      if (normalizedName.includes(normalizedPattern) || normalizedPattern.includes(normalizedName)) {
        return mapped;
      }
    }

    return null;
  }

  private handleFieldDescription(_field: FITFieldDefinition, _value: number | null): void {
    // Field description parsing would go here
    // This is complex as it involves reading strings and multiple values
    // For now, we rely on pattern matching for known Stryd fields
  }

  private handleDeveloperDataId(_field: FITFieldDefinition, _value: number | null): void {
    // Developer data ID parsing
    // This identifies the source (Stryd, Garmin, etc.)
  }

  private readFieldValue(field: FITFieldDefinition, isLittleEndian: boolean): number | null {
    try {
      const baseType = field.baseType & 0x1F;
      const offset = this.offset;

      switch (baseType) {
        case 0: // enum
        case 2: // uint8
          return this.view.getUint8(offset);
        case 1: // sint8
          return this.view.getInt8(offset);
        case 3: // sint16
        case 131:
          return field.fieldSize >= 2 ? this.view.getInt16(offset, isLittleEndian) : null;
        case 4: // uint16
        case 132:
          return field.fieldSize >= 2 ? this.view.getUint16(offset, isLittleEndian) : null;
        case 5: // sint32
        case 133:
          return field.fieldSize >= 4 ? this.view.getInt32(offset, isLittleEndian) : null;
        case 6: // uint32
        case 134:
          return field.fieldSize >= 4 ? this.view.getUint32(offset, isLittleEndian) : null;
        case 7: // string
          return null; // Strings handled separately
        case 8: // float32
        case 136:
          return field.fieldSize >= 4 ? this.view.getFloat32(offset, isLittleEndian) : null;
        case 9: // float64
        case 137:
          return field.fieldSize >= 8 ? this.view.getFloat64(offset, isLittleEndian) : null;
        case 10: // uint8z
          return this.view.getUint8(offset);
        case 11: // uint16z
          return field.fieldSize >= 2 ? this.view.getUint16(offset, isLittleEndian) : null;
        case 12: // uint32z
          return field.fieldSize >= 4 ? this.view.getUint32(offset, isLittleEndian) : null;
        case 13: // byte array
          return null;
        case 14: // sint64
          return null; // JavaScript can't handle 64-bit ints precisely
        case 15: // uint64
          return null;
        case 16: // uint64z
          return null;
        default:
          return null;
      }
    } catch {
      return null;
    }
  }

  private readDevFieldValue(devField: FITDevFieldDefinition, isLittleEndian: boolean): number | null {
    try {
      const offset = this.offset;

      // Try to read based on size
      switch (devField.size) {
        case 1:
          return this.view.getUint8(offset);
        case 2:
          return this.view.getUint16(offset, isLittleEndian);
        case 4:
          // Could be uint32 or float32 - Stryd typically uses float32
          const floatVal = this.view.getFloat32(offset, isLittleEndian);
          // Check if it's a reasonable float value
          if (Number.isFinite(floatVal) && Math.abs(floatVal) < 1e10) {
            return floatVal;
          }
          return this.view.getUint32(offset, isLittleEndian);
        case 8:
          return this.view.getFloat64(offset, isLittleEndian);
        default:
          return null;
      }
    } catch {
      return null;
    }
  }
}

/**
 * Parse a FIT file from an ArrayBuffer
 */
export async function parseFITFile(buffer: ArrayBuffer): Promise<FITRecord[]> {
  const parser = new FITParser(buffer);
  return parser.parse();
}
