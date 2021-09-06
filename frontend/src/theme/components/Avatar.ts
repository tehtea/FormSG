import { ComponentMultiStyleConfig } from '@chakra-ui/react'

export const Avatar: ComponentMultiStyleConfig = {
  parts: ['excessLabel', 'container', 'badge'],
  baseStyle: {
    container: {
      backgroundColor: 'primary.500',
      fontSize: '0.875rem',
      fontWeight: '500',
      width: '2.5rem',
      height: '2.5rem',
      color: 'white',
    },
    badge: {
      borderColor: 'white',
      bg: 'danger.500',
      width: '0.55rem',
      height: '0.55rem',
      borderWidth: '0.0625rem',
      position: 'absolute',
      top: '2.125rem',
      left: '2.125rem',
    },
  },
}
