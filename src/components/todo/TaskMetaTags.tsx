import { computed, defineComponent, type PropType } from 'vue'
import { Tag } from 'ant-design-vue'
import type { Task, TaskPriority } from '../../types/todo'

type DueStatus = 'none' | 'overdue' | 'today' | 'tomorrow' | 'week'

const PRIORITY_LABEL: Record<TaskPriority, string> = {
  high: '高',
  medium: '中',
  low: '低',
}

function getDueTagColor(status: DueStatus): string {
  if (status === 'overdue') return 'red'
  if (status === 'today') return 'orange'
  if (status === 'tomorrow') return 'blue'
  if (status === 'week') return 'cyan'
  return 'default'
}

export default defineComponent({
  name: 'TaskMetaTags',
  props: {
    task: {
      type: Object as PropType<Task>,
      required: true,
    },
    projectName: {
      type: String,
      required: true,
    },
    dueDateText: {
      type: String,
      required: true,
    },
    dueHint: {
      type: String as PropType<string | null>,
      default: null,
    },
    dueStatus: {
      type: String as PropType<DueStatus>,
      required: true,
    },
  },
  setup(props) {
    const priorityLabel = computed(() => PRIORITY_LABEL[props.task.priority] ?? props.task.priority)
    const dueColor = computed(() => getDueTagColor(props.dueStatus))

    return () => (
      <>
        <Tag color={props.task.priority === 'high' ? 'red' : props.task.priority === 'medium' ? 'gold' : 'green'}>
          优先级：{priorityLabel.value}
        </Tag>
        <Tag color="purple">{props.projectName || '未知清单'}</Tag>
        <Tag color={dueColor.value}>
          截止：{props.dueDateText}
          {props.dueHint ? ` · ${props.dueHint}` : ''}
        </Tag>
        <Tag color={props.task.completed ? 'success' : 'processing'}>
          {props.task.completed ? '已完成' : '未完成'}
        </Tag>
      </>
    )
  },
})
