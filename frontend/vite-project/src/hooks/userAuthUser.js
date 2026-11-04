import { useQuery } from "@tanstack/react-query";
import { fetchAuthUser } from "../lib/api.js";

const useAuthUser = () => {
  const { data, isLoading, error } = useQuery({
    queryKey: ["authUser"],
    queryFn: fetchAuthUser,
    retry: false,
    staleTime: 60_000,
    refetchOnWindowFocus: false,
  });
  return { authenticatedUser: data?.user, isLoading, error };
};

export default useAuthUser;