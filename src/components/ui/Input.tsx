'use client';

import { useFormStatus } from 'react-dom';

type InputIcon = "arrow" | "angle-right";

interface InputProps {
  icon: InputIcon;
  placeHolder: string;
  disabled?: boolean;
  action?: (formData: FormData) => void | Promise<void>;
}

function FormContent({
  icon,
  placeHolder,
  disabled,
}: {
  icon: InputIcon;
  placeHolder: string;
  disabled?: boolean;
}) {
  const { pending } = useFormStatus();
  const isDisabled = disabled || pending;

  return (
    <>
      <input
        type="email"
        name="email"
        placeholder={placeHolder}
        className="w-full p-3 pr-14 border border-gray-300 rounded-full text-black disabled:opacity-60"
        disabled={isDisabled}
      />

      <button
        type="submit"
        disabled={isDisabled}
        className="absolute right-3 top-1/2 -translate-y-1/2 h-8 w-8 flex items-center justify-center bg-black text-white rounded-full disabled:opacity-60"
        aria-busy={pending ? "true" : "false"}
      >
        {pending ? (
          // 🔄 Spinner
          <span className="h-4 w-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
        ) : (
          <>
            {icon === "arrow" && (
              <svg
                className="w-5 h-5 text-white"
                aria-hidden="true"
                xmlns="http://www.w3.org/2000/svg"
                width="24"
                height="24"
                fill="none"
                viewBox="0 0 24 24"
              >
                <path
                  stroke="currentColor"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  d="M19 12H5m14 0-4 4m4-4-4-4"
                />
              </svg>
            )}

            {icon === "angle-right" && (
              <svg
                className="w-6 h-6 text-white"
                aria-hidden="true"
                xmlns="http://www.w3.org/2000/svg"
                width="24"
                height="24"
                fill="none"
                viewBox="0 0 24 24"
              >
                <path
                  stroke="currentColor"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  d="m9 5 7 7-7 7"
                />
              </svg>
            )}
          </>
        )}
      </button>
    </>
  );
}

export default function Input({ icon, placeHolder, disabled, action }: InputProps) {
  return (
    <form className="w-full relative" action={action}>
      <FormContent icon={icon} placeHolder={placeHolder} disabled={disabled} />
    </form>
  );
}
