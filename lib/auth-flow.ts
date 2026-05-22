import {
  DISPLAY_NAME_REGEX,
  EMAIL_REGEX,
  EMPTY_AUTH_ERRORS,
  STRONG_PASSWORD_REGEX,
  type AuthFieldErrors,
  type AuthMode,
} from './home-screen'

export type AuthServerFeedback =
  | {
      kind: 'field_errors'
      errors: AuthFieldErrors
    }
  | {
      kind: 'alert'
      title: string
      message: string
    }

function createEmptyAuthErrors(): AuthFieldErrors {
  return { ...EMPTY_AUTH_ERRORS }
}

export function hasAuthErrors(errors: AuthFieldErrors) {
  return Object.values(errors).some(Boolean)
}

export function validateDisplayName(value: string) {
  if (!DISPLAY_NAME_REGEX.test(value.trim())) {
    return 'Името трябва да е между 2 и 40 символа и да съдържа само букви и интервали.'
  }

  return null
}

export function validateEmail(value: string) {
  if (!EMAIL_REGEX.test(value.trim())) {
    return 'Въведи валиден имейл адрес.'
  }

  return null
}

export function validateStrongPassword(value: string) {
  if (!STRONG_PASSWORD_REGEX.test(value)) {
    return 'Паролата трябва да съдържа поне 8 символа, малка и главна буква, число и специален символ.'
  }

  return null
}

export function getSignUpValidationErrors(input: {
  displayName: string
  email: string
  password: string
}) {
  const errors = createEmptyAuthErrors()
  const normalizedDisplayName = input.displayName.trim()
  const normalizedEmail = input.email.trim().toLowerCase()

  if (!normalizedDisplayName) {
    errors.displayName = 'Въведи име.'
  } else {
    const displayNameError = validateDisplayName(normalizedDisplayName)

    if (displayNameError) {
      errors.displayName = displayNameError
    }
  }

  if (!normalizedEmail) {
    errors.email = 'Въведи имейл.'
  } else {
    const emailError = validateEmail(normalizedEmail)

    if (emailError) {
      errors.email = emailError
    }
  }

  if (!input.password) {
    errors.password = 'Въведи парола.'
  } else {
    const passwordError = validateStrongPassword(input.password)

    if (passwordError) {
      errors.password = passwordError
    }
  }

  return errors
}

export function getSignInValidationErrors(input: { email: string; password: string }) {
  const errors = createEmptyAuthErrors()
  const normalizedEmail = input.email.trim().toLowerCase()

  if (!normalizedEmail) {
    errors.email = 'Въведи имейл.'
  } else {
    const emailError = validateEmail(normalizedEmail)

    if (emailError) {
      errors.email = emailError
    }
  }

  if (!input.password) {
    errors.password = 'Въведи парола.'
  }

  return errors
}

export function getForgotPasswordValidationErrors(email: string) {
  const errors = createEmptyAuthErrors()
  const normalizedEmail = email.trim().toLowerCase()

  if (!normalizedEmail) {
    errors.email = 'Въведи имейл.'
    return errors
  }

  const emailError = validateEmail(normalizedEmail)

  if (emailError) {
    errors.email = emailError
  }

  return errors
}

export function getResetPasswordValidationErrors(input: {
  password: string
  confirmPassword: string
}) {
  const errors = createEmptyAuthErrors()

  if (!input.password) {
    errors.password = 'Въведи нова парола.'
  } else {
    const passwordError = validateStrongPassword(input.password)

    if (passwordError) {
      errors.password = passwordError
    }
  }

  if (!input.confirmPassword) {
    errors.confirmPassword = 'Потвърди новата парола.'
  } else if (input.password && input.password !== input.confirmPassword) {
    errors.confirmPassword = 'Паролите не съвпадат.'
  }

  return errors
}

export function getAuthServerFeedback(message: string, mode: AuthMode): AuthServerFeedback {
  const normalizedMessage = message.toLowerCase()

  if (normalizedMessage.includes('invalid login credentials')) {
    return {
      kind: 'field_errors',
      errors: {
        ...EMPTY_AUTH_ERRORS,
        email: 'Грешен имейл или парола.',
        password: 'Грешен имейл или парола.',
      },
    }
  }

  if (normalizedMessage.includes('email not confirmed')) {
    return {
      kind: 'field_errors',
      errors: {
        ...EMPTY_AUTH_ERRORS,
        email: 'Потвърди имейла си и после влез.',
      },
    }
  }

  if (normalizedMessage.includes('user already registered')) {
    return {
      kind: 'field_errors',
      errors: {
        ...EMPTY_AUTH_ERRORS,
        email: 'Вече има акаунт с този имейл.',
      },
    }
  }

  if (normalizedMessage.includes('password should be at least')) {
    return {
      kind: 'field_errors',
      errors: {
        ...EMPTY_AUTH_ERRORS,
        password: 'Паролата е твърде къса.',
      },
    }
  }

  if (normalizedMessage.includes('unable to validate email address') || normalizedMessage.includes('invalid email')) {
    return {
      kind: 'field_errors',
      errors: {
        ...EMPTY_AUTH_ERRORS,
        email: 'Въведи валиден имейл адрес.',
      },
    }
  }

  if (normalizedMessage.includes('network request failed') || normalizedMessage.includes('fetch')) {
    return {
      kind: 'alert',
      title: 'Няма връзка',
      message: 'Провери интернет връзката си и опитай отново.',
    }
  }

  if (normalizedMessage.includes('same password')) {
    return {
      kind: 'field_errors',
      errors: {
        ...EMPTY_AUTH_ERRORS,
        password: 'Новата парола трябва да е различна от старата.',
      },
    }
  }

  if (normalizedMessage.includes('expired') || normalizedMessage.includes('invalid token')) {
    return {
      kind: 'alert',
      title: 'Невалиден линк',
      message: 'Линкът за възстановяване е изтекъл или е невалиден.',
    }
  }

  if (mode === 'register') {
    return {
      kind: 'alert',
      title: 'Грешка при регистрация',
      message,
    }
  }

  if (mode === 'forgot_password') {
    return {
      kind: 'alert',
      title: 'Грешка при изпращане',
      message,
    }
  }

  if (mode === 'reset_password') {
    return {
      kind: 'alert',
      title: 'Грешка при смяна на паролата',
      message,
    }
  }

  return {
    kind: 'alert',
    title: 'Грешка при вход',
    message,
  }
}