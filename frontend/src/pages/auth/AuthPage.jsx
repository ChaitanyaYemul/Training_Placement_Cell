import { useState } from 'react';
import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom';
import { useRegistration } from '../../hooks/useRegistration.js';
import { useAuth } from '../../hooks/useAuth.js';
import {
  Button,
  Field,
  FormErrors,
  PageHeader,
  QueryState,
} from '../../components/ui.jsx';
export default function AuthPage({ register = false }) {
  const { user, me, login } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const registration = useRegistration();
  const [input, setInput] = useState({ email: '', password: '', fullName: '' });
  const mutation = register ? registration : login;
  if (me.isPending || me.isError) return <QueryState query={me} />;
  if (user) return <Navigate to={`/${user.role}/dashboard`} replace />;
  const change = (key) => (event) =>
    setInput({ ...input, [key]: event.target.value });
  async function submit(event) {
    event.preventDefault();
    try {
      if (register) {
        await registration.mutateAsync(input);
        navigate('/login', {
          replace: true,
          state: {
            message: 'Account created. Sign in to complete your profile.',
          },
        });
      } else {
        const current = await login.mutateAsync({
          email: input.email,
          password: input.password,
        });
        const from = location.state?.from;
        navigate(
          from?.startsWith(`/${current.role}/`)
            ? from
            : `/${current.role}/dashboard`,
          { replace: true },
        );
      }
    } catch {
      /* Mutation exposes the normalized API error. */
    }
  }
  const detail = (field) =>
    mutation.error?.details?.find((item) => item.field === `body.${field}`)
      ?.message;
  return (
    <div className="mx-auto max-w-md">
      <PageHeader
        title={register ? 'Create your student account' : 'Welcome back'}
        description={
          register
            ? 'One account for your placement journey.'
            : 'Sign in to your placement workspace.'
        }
      />
      {location.state?.message && (
        <p role="status" className="notice">
          {location.state.message}
        </p>
      )}
      <form className="panel space-y-5" onSubmit={submit}>
        <FormErrors error={mutation.error} />
        {register && (
          <Field
            label="Full name"
            autoComplete="name"
            required
            maxLength={120}
            value={input.fullName}
            onChange={change('fullName')}
            error={detail('fullName')}
          />
        )}
        <Field
          label="Email"
          type="email"
          autoComplete="username"
          maxLength={254}
          required
          value={input.email}
          onChange={change('email')}
          error={detail('email')}
        />
        <Field
          label="Password"
          type="password"
          autoComplete={register ? 'new-password' : 'current-password'}
          minLength={8}
          maxLength={1024}
          required
          value={input.password}
          onChange={change('password')}
          error={detail('password')}
          hint={register ? 'At least 8 characters.' : undefined}
        />
        <Button type="submit" disabled={mutation.isPending}>
          {mutation.isPending
            ? 'Please wait…'
            : register
              ? 'Create account'
              : 'Sign in'}
        </Button>
        <p className="text-sm">
          {register ? 'Already registered? ' : 'New here? '}
          <Link className="text-link" to={register ? '/login' : '/register'}>
            {register ? 'Sign in' : 'Create a student account'}
          </Link>
        </p>
      </form>
    </div>
  );
}
