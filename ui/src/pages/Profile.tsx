import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import api from "@/services/apiServer";
import { sessionStorage } from "@/utils/sessionStorage";

export default () => {
  const { user, login, logout } = useAuth();
  const [userData, setUserData] = useState<any>(null);
  const [nickname, setNickname] = useState("");
  const [isEditing, setIsEditing] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!user?.sub) return;
    const token = sessionStorage.getAccessToken();
    if (token) api.setAccessToken(token);
    
    setLoading(true);
    api.getUser(user.sub)
      .then((data) => {
        setUserData(data);
        setNickname(data.nickname || "");
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [user?.sub]);

  const handleSave = async () => {
    if (!user?.sub) return;
    setLoading(true);
    try {
      const updated = await api.updateNickname(user.sub, nickname.trim() || null);
      setUserData(updated);
      setNickname(updated.nickname || "");
      setIsEditing(false);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  if (!user) {
    return (
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        <h1 className="text-4xl font-bold mb-8">Profile</h1>
        <Card>
          <CardContent className="p-6 text-center">
            <Button onClick={login}>Login</Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      <h1 className="text-4xl font-bold mb-8">Profile</h1>
      <Card>
        <CardHeader>
          <CardTitle>User Information</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <label className="text-sm font-medium">Email</label>
            <p className="text-muted-foreground">{userData?.email || "Loading..."}</p>
          </div>
          <div>
            <label className="text-sm font-medium">Nickname</label>
            {isEditing ? (
              <div className="space-y-2 mt-2">
                <Input
                  value={nickname}
                  onChange={(e) => setNickname(e.target.value)}
                  maxLength={20}
                  className="max-w-md"
                />
                <div className="flex gap-2">
                  <Button onClick={handleSave} disabled={loading} size="sm">
                    Save
                  </Button>
                  <Button
                    onClick={() => {
                      setIsEditing(false);
                      setNickname(userData?.nickname || "");
                    }}
                    variant="outline"
                    size="sm"
                  >
                    Cancel
                  </Button>
                </div>
              </div>
            ) : (
              <div className="space-y-2 mt-2">
                <p className="text-muted-foreground">
                  {userData?.nickname || "No nickname set"}
                </p>
                <Button onClick={() => setIsEditing(true)} variant="outline" size="sm">
                  {userData?.nickname ? "Edit" : "Add Nickname"}
                </Button>
              </div>
            )}
          </div>
          <div className="pt-4">
            <Button onClick={logout} variant="outline">
              Logout
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
