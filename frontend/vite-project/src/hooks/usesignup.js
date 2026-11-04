import { registerUser } from "../lib/api";
import { useMutation, useQueryClient } from "@tanstack/react-query";

const useSignup = () => {
  const queryClient = useQueryClient();
  const { mutate, isPending, error } = useMutation({
    mutationFn: registerUser,
    onSuccess: (data) => queryClient.setQueryData(["authUser"], data),
  });

  return {  SignupMutation: mutate, isPending, error  }
};
 export default  useSignup;