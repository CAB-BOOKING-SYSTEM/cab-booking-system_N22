export type RootStackParamList = {
  Splash:
    | {
        postLogin?: boolean;
        successMessage?: string;
      }
    | undefined;
  SignIn: undefined;
  SignUp: undefined;
  ForgotPassword: undefined;
  ResetPassword:
    | {
        email?: string;
      }
    | undefined;
};
