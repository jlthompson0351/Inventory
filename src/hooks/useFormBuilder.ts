import { useReducer, useCallback, useMemo } from 'react';
import { FormField } from '@/components/forms/FormFieldCard';

// Action types
enum FormActionType {
  INITIALIZE_FORM = 'INITIALIZE_FORM',
  UPDATE_META = 'UPDATE_META',
  ADD_FIELD = 'ADD_FIELD',
  REMOVE_FIELD = 'REMOVE_FIELD',
  UPDATE_FIELD = 'UPDATE_FIELD',
  MOVE_FIELD = 'MOVE_FIELD',
  REORDER_FIELDS = 'REORDER_FIELDS',
  SET_SELECTED_FIELD = 'SET_SELECTED_FIELD',
  ADD_OPTION = 'ADD_OPTION',
  REMOVE_OPTION = 'REMOVE_OPTION',
}

// State interface
interface FormState {
  title: string;
  description: string;
  fields: FormField[];
  selectedFieldId: string | null;
}

// Action interfaces
type FormAction =
  | { type: FormActionType.INITIALIZE_FORM; payload: { title: string; description: string; fields: FormField[] } }
  | { type: FormActionType.UPDATE_META; payload: { key: 'title' | 'description'; value: string } }
  | { type: FormActionType.ADD_FIELD; payload: FormField }
  | { type: FormActionType.REMOVE_FIELD; payload: string }
  | { type: FormActionType.UPDATE_FIELD; payload: { id: string; key: string; value: any } }
  | { type: FormActionType.MOVE_FIELD; payload: { id: string; direction: 'up' | 'down' } }
  | { type: FormActionType.REORDER_FIELDS; payload: { draggedId: string; targetId: string } }
  | { type: FormActionType.SET_SELECTED_FIELD; payload: string | null }
  | { type: FormActionType.ADD_OPTION; payload: { fieldId: string; option: string } }
  | { type: FormActionType.REMOVE_OPTION; payload: { fieldId: string; optionIndex: number } };

// Initial state
const initialState: FormState = {
  title: 'New Inventory Form',
  description: 'Enter inventory details using this form',
  fields: [
    {
      id: 'field_1',
      label: 'Item Name',
      type: 'text',
      required: true,
      placeholder: 'Enter item name',
      options: [],
      formula: '',
      description: '',
      mappable: false,
      inventory_action: 'none',
    },
    {
      id: 'field_2',
      label: 'Quantity',
      type: 'number',
      required: true,
      placeholder: 'Enter quantity',
      options: [],
      formula: '',
      description: '',
      mappable: false,
      inventory_action: 'none',
    },
  ],
  selectedFieldId: null,
};

// Reducer function
function formReducer(state: FormState, action: FormAction): FormState {
  switch (action.type) {
    case FormActionType.INITIALIZE_FORM:
      return {
        ...state,
        title: action.payload.title,
        description: action.payload.description,
        fields: action.payload.fields,
      };

    case FormActionType.UPDATE_META:
      return {
        ...state,
        [action.payload.key]: action.payload.value,
      };

    case FormActionType.ADD_FIELD:
      return {
        ...state,
        fields: [...state.fields, action.payload],
        selectedFieldId: action.payload.id,
      };

    case FormActionType.REMOVE_FIELD:
      return {
        ...state,
        fields: state.fields.filter(field => field.id !== action.payload),
        selectedFieldId: state.selectedFieldId === action.payload ? null : state.selectedFieldId,
      };

    case FormActionType.UPDATE_FIELD:
      return {
        ...state,
        fields: state.fields.map(field =>
          field.id === action.payload.id
            ? { ...field, [action.payload.key]: action.payload.value }
            : field
        ),
      };

    case FormActionType.MOVE_FIELD: {
      const { id, direction } = action.payload;
      const index = state.fields.findIndex(field => field.id === id);
      if (index === -1) return state;

      const newIndex = direction === 'up' ? index - 1 : index + 1;
      if (newIndex < 0 || newIndex >= state.fields.length) return state;

      const newFields = [...state.fields];
      [newFields[index], newFields[newIndex]] = [newFields[newIndex], newFields[index]];

      return {
        ...state,
        fields: newFields,
      };
    }

    case FormActionType.REORDER_FIELDS: {
      const { draggedId, targetId } = action.payload;
      const draggedIndex = state.fields.findIndex(f => f.id === draggedId);
      const targetIndex = state.fields.findIndex(f => f.id === targetId);

      if (draggedIndex === -1 || targetIndex === -1) return state;

      const newFields = [...state.fields];
      const [draggedField] = newFields.splice(draggedIndex, 1);
      newFields.splice(targetIndex, 0, draggedField);

      return {
        ...state,
        fields: newFields,
      };
    }

    case FormActionType.SET_SELECTED_FIELD:
      return {
        ...state,
        selectedFieldId: action.payload,
      };

    case FormActionType.ADD_OPTION:
      return {
        ...state,
        fields: state.fields.map(field =>
          field.id === action.payload.fieldId
            ? { ...field, options: [...field.options, action.payload.option] }
            : field
        ),
      };

    case FormActionType.REMOVE_OPTION:
      return {
        ...state,
        fields: state.fields.map(field =>
          field.id === action.payload.fieldId
            ? { ...field, options: field.options.filter((_, i) => i !== action.payload.optionIndex) }
            : field
        ),
      };

    default:
      return state;
  }
}

// Custom hook
export function useFormBuilder(initialData?: Partial<FormState>) {
  const [state, dispatch] = useReducer(formReducer, {
    ...initialState,
    ...initialData,
  });

  // Memoized getters
  const selectedField = useMemo(
    () => state.fields.find(f => f.id === state.selectedFieldId),
    [state.fields, state.selectedFieldId]
  );

  const calculatedFields = useMemo(
    () => state.fields.filter(f => f.type === 'calculated'),
    [state.fields]
  );

  const numberFields = useMemo(
    () => state.fields.filter(f => f.type === 'number'),
    [state.fields]
  );

  // Action creators
  const initializeForm = useCallback((title: string, description: string, fields: FormField[]) => {
    dispatch({ type: FormActionType.INITIALIZE_FORM, payload: { title, description, fields } });
  }, []);

  const updateFormMeta = useCallback((key: 'title' | 'description', value: string) => {
    dispatch({ type: FormActionType.UPDATE_META, payload: { key, value } });
  }, []);

  const generateFieldId = useCallback(() => {
    const ids = state.fields.map(field => {
      const match = field.id.match(/field_(\d+)/);
      return match ? parseInt(match[1]) : 0;
    });
    const maxId = Math.max(...ids, 0);
    return `field_${maxId + 1}`;
  }, [state.fields]);

  const addField = useCallback((type: string = 'text') => {
    const newField: FormField = {
      id: generateFieldId(),
      label: type === 'current_inventory' ? 'Current Inventory' : 
             type === 'calculated' ? 'Calculated Field' : 'New Field',
      type,
      required: type === 'current_inventory',
      placeholder: type === 'current_inventory' ? 'Enter current inventory count' : 
                   type === 'number' ? 'Enter number' : 
                   type === 'calculated' ? 'Will be calculated automatically' : 'Enter value',
      options: [],
      formula: '',
      description: '',
      mappable: type === 'current_inventory' || type === 'calculated',
      inventory_action: 'none',
    };
    dispatch({ type: FormActionType.ADD_FIELD, payload: newField });
    return newField.id;
  }, [generateFieldId]);

  const removeField = useCallback((id: string) => {
    dispatch({ type: FormActionType.REMOVE_FIELD, payload: id });
  }, []);

  const updateField = useCallback((id: string, key: string, value: any) => {
    dispatch({ type: FormActionType.UPDATE_FIELD, payload: { id, key, value } });
  }, []);

  const moveField = useCallback((id: string, direction: 'up' | 'down') => {
    dispatch({ type: FormActionType.MOVE_FIELD, payload: { id, direction } });
  }, []);

  const reorderFields = useCallback((draggedId: string, targetId: string) => {
    dispatch({ type: FormActionType.REORDER_FIELDS, payload: { draggedId, targetId } });
  }, []);

  const setSelectedField = useCallback((id: string | null) => {
    dispatch({ type: FormActionType.SET_SELECTED_FIELD, payload: id });
  }, []);

  const addOption = useCallback((fieldId: string, option: string) => {
    dispatch({ type: FormActionType.ADD_OPTION, payload: { fieldId, option } });
  }, []);

  const removeOption = useCallback((fieldId: string, optionIndex: number) => {
    dispatch({ type: FormActionType.REMOVE_OPTION, payload: { fieldId, optionIndex } });
  }, []);

  return {
    // State
    formData: {
      title: state.title,
      description: state.description,
      fields: state.fields,
    },
    selectedFieldId: state.selectedFieldId,
    selectedField,
    calculatedFields,
    numberFields,

    // Actions
    initializeForm,
    updateFormMeta,
    addField,
    removeField,
    updateField,
    moveField,
    reorderFields,
    setSelectedField,
    addOption,
    removeOption,
  };
} 