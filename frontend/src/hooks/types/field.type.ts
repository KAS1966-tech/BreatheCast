export interface FieldConfig {
    name: string;
    label: string;
    type: "number" | "select" | "text";
    options?: string[] | number[];
    min?: number;
    max?: number;
    step?: number;
}

export interface FieldProps {
    value: string | number;
    field: FieldConfig;
    handlechange: (
        e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
    ) => void;
}