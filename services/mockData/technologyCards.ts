import { TechnologyCard } from '../../types';

export let mockTechnologyCards: TechnologyCard[] = [
  {
    id: 'tech-card-tmp001',
    warehouseItemId: 'TMP001', // Corresponds to 'Темпе Классический Соевый 250гр'
    name: 'Технология производства классического соевого темпе',
    version: 2,
    updatedAt: new Date().toISOString(),
    isArchived: false,
    steps: [
      {
        id: 'safety-1',
        order: 1,
        type: 'safety',
        name: 'Техника Безопасности: Подготовка',
        description: 'При работе с шелушилкой использовать защитные очки и респиратор от пыли. Убедиться, что оборудование заземлено.'
      },
      {
        id: 'action-1',
        order: 2,
        type: 'action',
        name: 'Проверить и очистить бак шелушилки',
        description: 'Убедиться, что бак шелушильной машины чист и пуст перед началом работы.',
        requiredEquipmentId: 'equip-1',
        durationMinutes: 5,
        powerUsagePercentage: 10,
      },
      {
        id: 'action-2',
        order: 3,
        type: 'action',
        name: 'Шелушение и дробление сухой сои',
        description: 'Засыпать соевые бобы в машину и произвести сухое шелушение и дробление.',
        requiredEquipmentId: 'equip-1',
        durationMinutes: 15,
        powerUsagePercentage: 100,
      },
      {
        id: 'action-3',
        order: 4,
        type: 'action',
        name: 'Промывка дробленой сои',
        description: 'Тщательно промыть дробленую сою холодной водой до тех пор, пока вода не станет прозрачной.',
        requiredEquipmentId: 'equip-2',
        durationMinutes: 10,
        powerUsagePercentage: 100,
      },
      {
        id: 'safety-2',
        order: 5,
        type: 'safety',
        name: 'Техника Безопасности: Варка',
        description: 'При работе с варочным котлом использовать термостойкие перчатки. Избегать попадания пара и кипятка на открытые участки кожи.'
      },
      {
        id: 'process-1',
        order: 6,
        type: 'process',
        name: 'Варка сои с 70% уксусом',
        description: 'Залить промытую сою водой и варить. За 10 минут до конца варки добавить 70% уксус (используйте калькулятор ниже для расчета). Параллельная задача: Пока соя варится, можно проткнуть зип-лок пакеты для инкубации и пообедать.',
        requiredEquipmentId: 'equip-3',
        durationMinutes: 45,
        powerUsagePercentage: 90,
      },
      {
        id: 'action-4',
        order: 7,
        type: 'action',
        name: 'Слив воды',
        description: 'После завершения варки полностью слить воду с сои.'
      },
      {
        id: 'process-2',
        order: 8,
        type: 'process',
        name: 'Сушка в смесительной машине',
        description: 'Поместить горячую сою в смесительную машину, направить на нее вентиляторы для быстрой сушки и охлаждения. Параллельная задача: Пока соя сушится, наклеить этикетки на упаковки.',
        requiredEquipmentId: 'equip-4',
        durationMinutes: 25,
        powerUsagePercentage: 70,
      },
      {
        id: 'ingredient-1',
        order: 9,
        type: 'ingredient',
        name: 'Добавить 9% уксус',
        description: 'Через 10 минут после начала сушки добавить 9% уксус (используйте калькулятор ниже для расчета) и перемешать.',
        componentId: 'HI004',
        componentName: 'Уксус яблочный',
        plannedQuantity: 0.5,
        unit: 'л'
      },
       {
        id: 'ingredient-2',
        order: 10,
        type: 'ingredient',
        name: 'Добавить темпе-стартер',
        description: 'Равномерно распределить закваску по сухим и остывшим бобам.',
        componentId: 'HI005',
        componentName: 'Закваска Rhizopus Oligosporus',
        plannedQuantity: 50,
        unit: 'гр'
      },
      {
        id: 'action-5',
        order: 11,
        type: 'action',
        name: 'Финальное перемешивание',
        description: 'Кратковременно перемешать сою в смесительной машине для равномерного распределения закваски.',
        requiredEquipmentId: 'equip-4',
        durationMinutes: 5,
        powerUsagePercentage: 50,
      },
       {
        id: 'action-6',
        order: 12,
        type: 'action',
        name: 'Фасовка',
        description: 'Высыпать сою в чистый контейнер. Распределить по зип-лок пакетам согласно весу (например, 250гр).'
      },
      {
        id: 'process-3',
        order: 13,
        type: 'process',
        name: 'Инкубация',
        description: 'Сложить пакеты в термостат. Инкубировать при температуре 30-32°C в течение 24-36 часов.',
        requiredEquipmentId: 'equip-5',
        durationMinutes: 1800, // 30 hours
        powerUsagePercentage: 20, // Cycles on/off
      },
      {
        id: 'action-7',
        order: 14,
        type: 'action',
        name: 'Охлаждение',
        description: 'После завершения инкубации немедленно охладить готовую продукцию в холодильнике.'
      }
    ]
  }
];