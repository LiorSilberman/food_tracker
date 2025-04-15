import React, { useState } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    ScrollView,
    Modal,
    FlatList,
} from 'react-native';

// Define ingredient type
type Ingredient = {
    portion_g: number;
    source: string;
};

// Props for the component
type Props = {
    initialIngredients: Record<string, Ingredient>;
    originalTotals: {
        calories: number;
        carbs_g: number;
        protein_g: number;
        fat_g: number;
    };
    onRecalculate: (updatedIngredients: any, originalTotals: any, originalIngredients: any) => void;
    onClose: () => void;
    disableEditing?: boolean;
};

export default function EditableNutritionResult({
    initialIngredients,
    originalTotals,
    onRecalculate,
    onClose,
    disableEditing = false,
}: Props) {
    const [ingredients, setIngredients] = useState(initialIngredients);
    const [selectedIngredient, setSelectedIngredient] = useState<string | null>(null);
    const [modalVisible, setModalVisible] = useState(false);

    const openPicker = (key: string) => {
        if (disableEditing) return;
        setSelectedIngredient(key);
        setModalVisible(true);
    };

    const handlePortionSelect = (portion: number) => {
        if (selectedIngredient) {
            setIngredients(prev => ({
                ...prev,
                [selectedIngredient]: {
                    ...prev[selectedIngredient],
                    portion_g: portion,
                },
            }));
        }
        setModalVisible(false);
    };

    const handleConfirm = () => {
        onRecalculate(ingredients, originalTotals, initialIngredients);
    };

    const handleSaveAndClose = () => {
        onRecalculate(ingredients, originalTotals, initialIngredients);
        onClose();
    };

    const portionOptions = Array.from({ length: 21 }, (_, i) => i * 25); // 0 to 500g

    return (
        <ScrollView style={styles.container}>
            <Text style={styles.title}>ערוך את המרכיבים לפי הכמות שאכלת</Text>

            {Object.entries(ingredients).map(([name, data]) => (
                <TouchableOpacity
                    key={name}
                    style={[styles.itemCard, disableEditing && styles.disabledCard]}
                    onPress={() => openPicker(name)}
                    disabled={disableEditing}
                >
                    <Text style={styles.itemName}>{name}</Text>
                    <View style={styles.portionDisplay}>
                        <Text style={styles.portionText}>{data.portion_g} גרם</Text>
                        {!disableEditing && <Text style={styles.tapHint}>לחץ לשינוי</Text>}
                    </View>
                </TouchableOpacity>
            ))}

            {!disableEditing && (
                <TouchableOpacity style={styles.button} onPress={handleConfirm}>
                    <Text style={styles.buttonText}>חשב מחדש</Text>
                </TouchableOpacity>
            )}

            <TouchableOpacity style={styles.closeEditorButton} onPress={handleSaveAndClose}>
                <Text style={styles.buttonText}>אישור ושמור</Text>
            </TouchableOpacity>

            {/* Modal Picker */}
            <Modal visible={modalVisible} animationType="slide" transparent>
                <View style={styles.modalOverlay}>
                    <View style={styles.modalContainer}>
                        <Text style={styles.modalTitle}>בחר כמות (גרם)</Text>
                        <FlatList
                            data={portionOptions}
                            keyExtractor={(item) => item.toString()}
                            renderItem={({ item }) => (
                                <TouchableOpacity
                                    style={styles.option}
                                    onPress={() => handlePortionSelect(item)}
                                >
                                    <Text style={styles.optionText}>{item} גרם</Text>
                                </TouchableOpacity>
                            )}
                        />
                        <TouchableOpacity onPress={() => setModalVisible(false)} style={styles.closeButton}>
                            <Text style={styles.closeText}>ביטול</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </Modal>
        </ScrollView>
    );
}

const styles = StyleSheet.create({
    container: {
        padding: 16,
        backgroundColor: '#fff',
        borderRadius: 16,
        marginTop: 20,
    },
    title: {
        fontSize: 18,
        fontWeight: '700',
        marginBottom: 16,
        textAlign: 'center',
        color: '#31333d',
    },
    itemCard: {
        backgroundColor: '#f3f9f9',
        borderRadius: 12,
        padding: 16,
        marginBottom: 12,
        borderWidth: 1,
        borderColor: '#ddd',
    },
    disabledCard: {
        backgroundColor: '#eee',
    },
    itemName: {
        fontSize: 16,
        fontWeight: '600',
        color: '#333',
        marginBottom: 4,
    },
    portionDisplay: {
        flexDirection: 'row-reverse',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    portionText: {
        fontSize: 16,
        color: '#444',
    },
    tapHint: {
        fontSize: 13,
        color: '#999',
    },
    button: {
        marginTop: 24,
        backgroundColor: '#66BB6A',
        paddingVertical: 14,
        borderRadius: 14,
        alignItems: 'center',
    },
    buttonText: {
        color: '#fff',
        fontWeight: '700',
        fontSize: 16,
    },
    secondaryButton: {
        marginTop: 12,
        backgroundColor: '#90CAF9',
        paddingVertical: 12,
        borderRadius: 12,
        alignItems: 'center',
    },
    secondaryButtonText: {
        color: '#fff',
        fontWeight: '600',
        fontSize: 15,
    },
    modalOverlay: {
        flex: 1,
        backgroundColor: '#000000aa',
        justifyContent: 'center',
        alignItems: 'center',
    },
    modalContainer: {
        backgroundColor: '#fff',
        width: '80%',
        maxHeight: '70%',
        borderRadius: 16,
        padding: 20,
    },
    modalTitle: {
        fontSize: 18,
        fontWeight: '700',
        marginBottom: 12,
        textAlign: 'center',
    },
    option: {
        paddingVertical: 12,
        borderBottomWidth: 1,
        borderColor: '#eee',
        alignItems: 'center',
    },
    optionText: {
        fontSize: 16,
        color: '#333',
    },
    closeButton: {
        marginTop: 12,
        alignItems: 'center',
    },
    closeText: {
        color: '#999',
        fontSize: 16,
    },
    closeEditorButton: {
        marginTop: 12,
        backgroundColor: '#607D8B',
        paddingVertical: 14,
        borderRadius: 14,
        alignItems: 'center',
    },
});