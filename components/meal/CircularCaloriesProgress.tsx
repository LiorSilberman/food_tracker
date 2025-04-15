import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { AnimatedCircularProgress } from 'react-native-circular-progress';

export default function CircularCaloriesProgress({
    consumed,
    total
}: {
    consumed: number;
    total: number;
}) {
    const fill = total > 0 ? (consumed / total) * 100 : 0;

    return (
        <View style={styles.container}>
            <Text style={styles.sideText}>
                <Text style={styles.consumedText}>{consumed}</Text>
                {'\n'}קלוריות{'\n'}נצרכו
            </Text>
            
            <View style={styles.progressContainer}>
                <AnimatedCircularProgress
                    size={150}
                    width={15}
                    fill={fill > 100 ? 100 : fill}
                    tintColor="#44f0a5"
                    backgroundColor="#E0E0E0"
                    rotation={0}
                    lineCap="round"
                >
                    {() => (
                        <View style={styles.centerContent}>
                            <Text style={styles.centerText}>{total}</Text>
                            <Text style={styles.calorieLabel}>קלוריות</Text>
                        </View>
                    )}
                </AnimatedCircularProgress>
            </View>
            
            <Text style={styles.sideText}>
                <Text style={styles.remainingText}>{total - consumed}</Text>
                {'\n'}קלוריות{'\n'}נותרו
            </Text>
        </View>
    );
}

// const styles = StyleSheet.create({
//     container: {
//         flexDirection: 'row',
//         alignItems: 'center',
//         justifyContent: 'space-around',
//         marginVertical: 20,
//         width: '100%',
//     },
//     sideText: {
//         margin: 10,
//         textAlign: 'center',
//         fontSize: 14,
//         fontWeight: 'bold',
//         color: '#484e5c',
//     },
//     centerText: {
//         fontSize: 22,
//         fontWeight: 'bold',
//         color: '#484e5c',
//     },
//     centerContent: {
//         alignItems: 'center',
//       },
// });


const styles = StyleSheet.create({
    container: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-around',
        marginVertical: 25,
        width: '100%',
        paddingHorizontal: 10,
    },
    sideText: {
        margin: 10,
        textAlign: 'center',
        fontSize: 14,
        fontWeight: '700',
        color: '#484e5c',
        lineHeight: 22,
    },
    centerText: {
        fontSize: 24,
        fontWeight: '800',
        color: '#31333d',
        textAlign: 'center',
    },
    centerContent: {
        alignItems: 'center',
        justifyContent: 'center',
        padding: 5,
    },
    // New styles
    progressContainer: {
        elevation: 4,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        backgroundColor: 'transparent',
        borderRadius: 75, // Half of the size (150)
    },
    calorieLabel: {
        fontSize: 16,
        color: '#484e5c',
        marginTop: 4,
        fontWeight: '600',
    },
    remainingText: {
        color: '#44f0a5',
        fontWeight: '700',
    },
    consumedText: {
        color: '#31333d',
        fontWeight: '700',
    }
});